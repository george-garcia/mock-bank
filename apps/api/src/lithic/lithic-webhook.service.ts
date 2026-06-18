import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CardsService } from '../cards/cards.service';
import { LedgerService } from '../ledger/ledger.service';

export interface LithicWebhookPayload {
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

type EventPayload = LithicWebhookPayload['payload'];

/**
 * Business logic for inbound Lithic webhook events: authorization decisions,
 * settlement → ledger posting, and card lifecycle events. The controller only
 * receives the request and delegates here.
 */
@Injectable()
export class LithicWebhookService {
  private readonly logger = new Logger(LithicWebhookService.name);

  constructor(
    private cardsService: CardsService,
    private ledgerService: LedgerService,
  ) {}

  async processEvent(body: LithicWebhookPayload) {
    this.logger.log(`Received Lithic webhook: ${body.event_type}`);

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

  private async handleAuthorization(payload: EventPayload) {
    if (!payload.card_token || payload.amount === undefined) {
      throw new BadRequestException('Missing card_token or amount');
    }

    const card = await this.cardsService.findByLithicToken(payload.card_token);
    if (!card) {
      this.logger.error(`Card not found for token: ${payload.card_token}`);
      return { approved: false, reason: 'card_not_found' };
    }

    const account = await this.cardsService.getAccountForCard(card.id);
    const balance = parseFloat(account.balance);
    const amount = Math.abs(payload.amount);

    if (balance < amount) {
      this.logger.warn(`Declining auth: insufficient funds (balance: ${balance}, amount: ${amount})`);
      return { approved: false, reason: 'insufficient_funds' };
    }

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

  private async handleSettlement(payload: EventPayload) {
    if (!payload.token) {
      throw new BadRequestException('Missing transaction token');
    }

    const cardTx = await this.cardsService.findCardTransactionByLithicToken(payload.token);
    if (!cardTx) {
      this.logger.error(`Card transaction not found: ${payload.token}`);
      return { processed: false };
    }

    const card = await this.cardsService.findByLithicToken(payload.card_token || '');
    if (!card) {
      this.logger.error(`Card not found for settlement: ${payload.card_token}`);
      return { processed: false };
    }

    // Post the settlement to the ledger. The settlement token is the idempotency key, so a
    // replayed webhook will not double-post.
    const result = await this.ledgerService.cardSettlement(card.accountId, {
      amount: cardTx.amount,
      description: `Card purchase: ${cardTx.merchantName}`,
      idempotencyKey: `card_settlement:${payload.token}`,
    });

    // Link the card transaction to its ledger journal and mark it settled.
    await this.cardsService.settleCardTransaction(cardTx.id, result.transaction.id);

    this.logger.log(`Settled transaction: ${payload.token}`);
    return { processed: true };
  }

  private async handleCardCreated(payload: EventPayload) {
    this.logger.log(`Card created event: ${payload.token}`);
    return { received: true };
  }

  private async handleCardStatusChanged(payload: EventPayload) {
    this.logger.log(`Card status changed: ${payload.token} -> ${payload.status}`);
    return { received: true };
  }
}
