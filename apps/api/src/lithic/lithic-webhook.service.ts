import { Injectable, Logger } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { LithicRepository } from './lithic.repository';
import { toDecimalString } from '../common/money';
import { LithicWebhookEvent, LithicTransaction, LithicPayment, CardEventType } from './lithic.types';

/**
 * The program's consumer of Lithic webhooks. It receives Lithic-shaped events
 * (transaction.created/updated, payment_transaction.created/updated) and posts to the bank's
 * general ledger based on the network event type in payload.events[]:
 *   CLEARING            → capture the hold + post the card_clearing journal
 *   AUTHORIZATION_REVERSAL → release the hold
 *   RETURN              → post a return (credit the cardholder)
 *   ACH_ORIGINATION_SETTLED → post the ACH debit/credit journal
 * Authorizations themselves are decided + held in real time by ASA, so transaction.created with an
 * AUTHORIZATION event needs no ledger action here.
 */
@Injectable()
export class LithicWebhookService {
  private readonly logger = new Logger(LithicWebhookService.name);

  constructor(
    private ledger: LedgerService,
    private auditService: AuditService,
    private repo: LithicRepository,
  ) {}

  async processEvent(event: LithicWebhookEvent): Promise<{ received: true }> {
    this.logger.log(`Lithic event: ${event.type}`);
    switch (event.type) {
      case 'transaction.created':
      case 'transaction.updated':
        await this.handleTransaction(event.payload as LithicTransaction);
        break;
      case 'payment_transaction.created':
      case 'payment_transaction.updated':
        await this.handlePayment(event.payload as LithicPayment);
        break;
      case 'card.created':
      case 'card.updated':
        break; // card lifecycle — no ledger impact
    }
    return { received: true };
  }

  private async handleTransaction(tx: LithicTransaction) {
    const latest = this.latestEventType(tx);
    const accountId = this.accountIdFromToken(tx.account_token);
    if (accountId === null) return;

    switch (latest) {
      case 'CLEARING': {
        await this.ledger.captureHold(`auth:${tx.token}`);
        const result = await this.ledger.cardClearing(accountId, {
          amount: toDecimalString(tx.settled_amount),
          description: `Card purchase: ${tx.merchant.descriptor}`,
          idempotencyKey: `card_clearing:${tx.token}`,
        });
        await this.linkLedger(tx.token, result.transaction.id);
        await this.auditService.record({ action: 'card.clearing', targetType: 'account', targetId: accountId, amountMinor: tx.settled_amount, metadata: { token: tx.token } });
        break;
      }
      case 'AUTHORIZATION_REVERSAL': {
        await this.ledger.releaseHold(`auth:${tx.token}`);
        await this.auditService.record({ action: 'card.authorization_reversal', targetType: 'card_transaction', targetId: tx.token });
        break;
      }
      case 'RETURN': {
        const result = await this.ledger.cardReturn(accountId, {
          amount: toDecimalString(tx.amount),
          description: `Merchant credit: ${tx.merchant.descriptor}`,
          idempotencyKey: `return:${tx.token}`,
        });
        await this.linkLedger(tx.token, result.transaction.id);
        await this.auditService.record({ action: 'card.return', targetType: 'account', targetId: accountId, amountMinor: tx.amount, metadata: { token: tx.token } });
        break;
      }
      case 'AUTHORIZATION': {
        await this.auditService.record({
          action: 'card.authorization',
          targetType: 'card_transaction',
          targetId: tx.token,
          amountMinor: tx.amount,
          metadata: { result: tx.result },
        });
        break;
      }
    }
  }

  private async handlePayment(payment: LithicPayment) {
    if (payment.status !== 'SETTLED') return; // only post on settlement
    const accountId = this.accountIdFromToken(payment.financial_account_token);
    if (accountId === null) return;

    const amount = toDecimalString(payment.amount);
    const result = payment.direction === 'DEBIT'
      ? await this.ledger.achDebit(accountId, { amount, description: 'ACH debit', idempotencyKey: `ach:${payment.token}` })
      : await this.ledger.achCredit(accountId, { amount, description: 'ACH credit (cash-out)', idempotencyKey: `ach:${payment.token}` });

    const row = await this.repo.findPaymentByToken(payment.token);
    if (row) await this.repo.updatePayment(row.id, { ledgerTransactionId: result.transaction.id });
    await this.auditService.record({
      action: payment.direction === 'DEBIT' ? 'ach.payment.debit' : 'ach.payment.credit',
      targetType: 'account',
      targetId: accountId,
      amountMinor: payment.amount,
      metadata: { token: payment.token },
    });
  }

  private latestEventType(tx: LithicTransaction): CardEventType | undefined {
    return tx.events.length ? tx.events[tx.events.length - 1].type : undefined;
  }

  private accountIdFromToken(token: string | undefined): number | null {
    const m = (token ?? '').match(/^account_(\d+)$/);
    return m ? Number(m[1]) : null;
  }

  private async linkLedger(token: string, ledgerTransactionId: number) {
    const row = await this.repo.findTransactionByToken(token);
    if (row) await this.repo.updateTransaction(row.id, { ledgerTransactionId });
  }
}
