import { Controller, Post, Body, Headers, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LithicService } from './lithic.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CardsService } from '../cards/cards.service';

interface LithicWebhookPayload {
  event_type: string;
  token: string;
  payload: {
    token?: string;
    card_token?: string;
    amount?: number;
    merchant?: {
      descriptor: string;
      city?: string;
      state?: string;
      country?: string;
      mcc?: string;
    };
    result?: 'APPROVED' | 'DECLINED';
    status?: string;
    authorization_code?: string;
    declined_reason?: string;
  };
}

@ApiTags('Webhooks')
@Controller('webhooks/lithic')
export class LithicWebhookController {
  private readonly logger = new Logger(LithicWebhookController.name);

  constructor(
    private lithicService: LithicService,
    private cardsService: CardsService,
    private transactionsService: TransactionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Receive Lithic webhook events' })
  async handleWebhook(
    @Body() body: LithicWebhookPayload,
    @Headers('x-lithic-webhook-secret') signature: string,
  ) {
    this.logger.log(`Received Lithic webhook: ${body.event_type}`);

    // In production, verify webhook signature here
    // const webhookSecret = this.configService.get('LITHIC_WEBHOOK_SECRET');

    switch (body.event_type) {
      case 'authorization':
        return this.handleAuthorization(body.payload);
      case 'settlement':
        return this.handleSettlement(body.payload);
      case 'card.created':
        return this.handleCardCreated(body.payload);
      case 'card.status_changed':
        return this.handleCardStatusChanged(body.payload);
      default:
        this.logger.warn(`Unhandled Lithic event type: ${body.event_type}`);
        return { received: true };
    }
  }

  private async handleAuthorization(payload: LithicWebhookPayload['payload']) {
    if (!payload.card_token || payload.amount === undefined) {
      throw new BadRequestException('Missing card_token or amount');
    }

    // Look up the card in our DB
    const card = await this.cardsService.findByLithicToken(payload.card_token);
    if (!card) {
      this.logger.error(`Card not found for token: ${payload.card_token}`);
      return { approved: false, reason: 'card_not_found' };
    }

    // Check account balance
    const account = await this.cardsService.getAccountForCard(card.id);
    const balance = parseFloat(account.balance);
    const amount = Math.abs(payload.amount);

    if (balance < amount) {
      this.logger.warn(`Declining auth: insufficient funds (balance: ${balance}, amount: ${amount})`);
      return { approved: false, reason: 'insufficient_funds' };
    }

    // Record authorization (pending transaction)
    await this.cardsService.recordCardTransaction(card.id, {
      lithicTransactionToken: payload.token || `auth-${Date.now()}`,
      merchantName: payload.merchant?.descriptor || 'Unknown',
      merchantMcc: payload.merchant?.mcc,
      merchantCity: payload.merchant?.city,
      merchantState: payload.merchant?.state,
      merchantCountry: payload.merchant?.country,
      amount: amount.toFixed(2),
      status: 'authorized',
      authCode: payload.authorization_code,
      metadata: JSON.stringify(payload),
    });

    this.logger.log(`Approved authorization for ${amount} at ${payload.merchant?.descriptor}`);
    return { approved: true };
  }

  private async handleSettlement(payload: LithicWebhookPayload['payload']) {
    if (!payload.token) {
      throw new BadRequestException('Missing transaction token');
    }

    // Find and update the card transaction
    const cardTx = await this.cardsService.findCardTransactionByLithicToken(payload.token);
    if (!cardTx) {
      this.logger.error(`Card transaction not found: ${payload.token}`);
      return { processed: false };
    }

    // Update to settled
    await this.cardsService.settleCardTransaction(cardTx.id, payload.token);

    // Create a real ledger transaction (debit the account)
    const card = await this.cardsService.findByLithicToken(payload.card_token || '');
    if (!card) {
      this.logger.error(`Card not found for settlement: ${payload.card_token}`);
      return { processed: false };
    }

    await this.transactionsService.recordSystemTransaction({
      accountId: card.accountId,
      type: 'card_settlement',
      amount: cardTx.amount,
      description: `Card purchase: ${cardTx.merchantName}`,
    });

    this.logger.log(`Settled transaction: ${payload.token}`);
    return { processed: true };
  }

  private async handleCardCreated(payload: LithicWebhookPayload['payload']) {
    this.logger.log(`Card created event: ${payload.token}`);
    return { received: true };
  }

  private async handleCardStatusChanged(payload: LithicWebhookPayload['payload']) {
    this.logger.log(`Card status changed: ${payload.token} -> ${payload.status}`);
    return { received: true };
  }
}
