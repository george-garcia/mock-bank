import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CardsService } from '../cards/cards.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { toMinor } from '../common/money';

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
    private auditService: AuditService,
  ) {}

  async processEvent(body: LithicWebhookPayload) {
    this.logger.log(`Received Lithic webhook: ${body.event_type}`);

    switch (body.event_type) {
      case 'authorization':
        return this.handleAuthorization(body.payload);
      case 'authorization.reversal':
        return this.handleAuthReversal(body.payload);
      case 'settlement':
        return this.handleSettlement(body.payload);
      case 'refund':
        return this.handleRefund(body.payload);
      case 'return':
        return this.handleReturn(body.payload);
      case 'card.created':
        return this.handleCardCreated(body.payload);
      case 'card.status_changed':
        return this.handleCardStatusChanged(body.payload);
      default:
        this.logger.warn(`Unhandled Lithic event type: ${body.event_type}`);
        return { received: true };
    }
  }

  // Authorization reversal — the merchant/processor cancels the auth before settlement.
  // Release the hold (frees available funds) and void the card transaction.
  private async handleAuthReversal(payload: EventPayload) {
    if (!payload.token) throw new BadRequestException('Missing transaction token');
    await this.ledgerService.releaseHold(`card_auth:${payload.token}`);
    const cardTx = await this.cardsService.findCardTransactionByLithicToken(payload.token);
    if (cardTx) await this.cardsService.voidCardTransaction(cardTx.id);
    await this.auditService.record({ action: 'card.auth_reversal', targetType: 'card_transaction', targetId: payload.token });
    this.logger.log(`Reversed authorization ${payload.token}`);
    return { reversed: true };
  }

  // Merchant credit / refund — money flows back to the customer account.
  private async handleRefund(payload: EventPayload) {
    if (!payload.card_token || payload.amount === undefined) {
      throw new BadRequestException('Missing card_token or amount');
    }
    const card = await this.cardsService.findByLithicToken(payload.card_token);
    if (!card) {
      this.logger.error(`Card not found for refund: ${payload.card_token}`);
      return { processed: false };
    }
    const amount = Math.abs(payload.amount).toFixed(2);
    const result = await this.ledgerService.refund(card.accountId, {
      amount,
      description: `Refund: ${payload.merchant?.descriptor || 'merchant credit'}`,
      idempotencyKey: `refund:${payload.token}`,
    });
    await this.auditService.record({
      action: 'card.refund',
      targetType: 'account',
      targetId: card.accountId,
      amountMinor: toMinor(amount),
      metadata: { token: payload.token, transactionId: result.transaction.id },
    });
    this.logger.log(`Refunded ${amount} to account ${card.accountId}`);
    return { processed: true, transactionId: result.transaction.id };
  }

  // Return / chargeback of a settled purchase — reverse the settlement journal.
  private async handleReturn(payload: EventPayload) {
    if (!payload.token) throw new BadRequestException('Missing transaction token');
    const cardTx = await this.cardsService.findCardTransactionByLithicToken(payload.token);
    if (!cardTx || !cardTx.transactionId) {
      this.logger.error(`No settled card transaction to return for token: ${payload.token}`);
      return { processed: false };
    }
    const result = await this.ledgerService.reverse(cardTx.transactionId, `Card return/chargeback for ${payload.token}`);
    await this.cardsService.voidCardTransaction(cardTx.id);
    await this.auditService.record({ action: 'card.return', targetType: 'card_transaction', targetId: payload.token });
    this.logger.log(`Returned settlement ${payload.token}`);
    return { processed: true, reversalId: result.transaction.id };
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

    const amount = Math.abs(payload.amount).toFixed(2);
    const baseTx = {
      lithicTransactionToken: payload.token || `auth-${Date.now()}`,
      merchantName: payload.merchant?.descriptor || 'Unknown',
      merchantMcc: payload.merchant?.mcc,
      merchantCity: payload.merchant?.city,
      merchantState: payload.merchant?.state,
      merchantCountry: payload.merchant?.country,
      amount,
      authCode: payload.authorization_code,
      metadata: JSON.stringify(payload),
    };

    // Honor a processor-side decline (fraud, velocity, etc.) and record it.
    if (payload.result === 'DECLINED') {
      await this.cardsService.recordCardTransaction(card.id, {
        ...baseTx,
        status: 'declined',
        declinedReason: payload.declined_reason || 'declined_by_processor',
      });
      return { approved: false, reason: 'declined_by_processor' };
    }

    // Place an authorization hold, reserving available funds. Idempotent on the auth token.
    try {
      await this.ledgerService.placeHold(card.accountId, {
        amount,
        externalRef: `card_auth:${payload.token}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // auto-expire after 7 days
        metadata: { cardId: card.id, merchant: payload.merchant?.descriptor },
      });
    } catch {
      // Insufficient available funds — record the declined attempt.
      await this.cardsService.recordCardTransaction(card.id, {
        ...baseTx,
        status: 'declined',
        declinedReason: 'insufficient_funds',
      });
      this.logger.warn(`Declining auth: insufficient available funds for card ${card.id}`);
      return { approved: false, reason: 'insufficient_funds' };
    }

    await this.cardsService.recordCardTransaction(card.id, { ...baseTx, status: 'authorized' });
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

    // Capture (release) the authorization hold so it no longer reduces available balance.
    await this.ledgerService.captureHold(`card_auth:${payload.token}`);

    // The settlement amount may differ from the authorized amount (partial / over-settlement);
    // post the actual settled amount.
    const settleAmount = payload.amount !== undefined ? Math.abs(payload.amount).toFixed(2) : cardTx.amount;

    // Post the settlement to the ledger. The settlement token is the idempotency key, so a
    // replayed webhook will not double-post.
    const result = await this.ledgerService.cardSettlement(card.accountId, {
      amount: settleAmount,
      description: `Card purchase: ${cardTx.merchantName}`,
      idempotencyKey: `card_settlement:${payload.token}`,
    });

    // Link the card transaction to its ledger journal and mark it settled.
    await this.cardsService.settleCardTransaction(cardTx.id, result.transaction.id);

    await this.auditService.record({
      action: 'card.settlement',
      targetType: 'account',
      targetId: card.accountId,
      amountMinor: toMinor(settleAmount),
      metadata: { token: payload.token, transactionId: result.transaction.id },
    });

    this.logger.log(`Settled ${settleAmount} (${payload.token})`);
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
