import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Card, CardTransaction, CardTransactionEvent } from '@mock-bank/database';
import { LithicRepository } from './lithic.repository';
import { AsaService } from './asa.service';
import { LithicWebhookService } from './lithic-webhook.service';
import {
  LithicCard, LithicTransaction, LithicTransactionEvent, LithicMerchant, LithicPayment,
  CardEventType, CardEventResult, CardType, SpendLimitDuration, PaymentDirection, PaymentMethod,
} from './lithic.types';

export interface CreateCardRequest {
  type: CardType;
  account_token: string;
  spend_limit?: number;
  spend_limit_duration?: SpendLimitDuration;
  memo?: string;
}

export interface AuthorizeInput {
  pan: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  amount: number; // minor units
  partnerId?: number; // acquirer that submitted the charge (used to scope refunds)
  merchant: { descriptor: string; mcc?: string; city?: string; state?: string; country?: string; acceptorId?: string };
}

export interface CreatePaymentInput {
  direction: PaymentDirection;
  amount: number; // minor units
  financialAccountToken: string;
  externalBankAccountToken: string;
  method?: PaymentMethod;
  idempotencyKey: string;
  grantId?: number;
}

const NETWORK = 'INTERLINK'; // the simulated card network
const uuid = () => randomUUID();
const newToken = () => uuid();

/**
 * The Lithic processor (mock). It issues cards, runs the card-network transaction lifecycle
 * (AUTHORIZATION → CLEARING / REVERSAL, CREDIT_AUTHORIZATION → RETURN), originates ACH Payments,
 * and emits Lithic-shaped webhooks. Authorization decisions are delegated to the program in real
 * time via ASA. Everything here is 1:1 with Lithic's API objects and event model.
 */
@Injectable()
export class LithicService {
  private readonly logger = new Logger(LithicService.name);

  constructor(
    private repo: LithicRepository,
    private asa: AsaService,
    private webhook: LithicWebhookService,
  ) {}

  // ─── Cards ──────────────────────────────────────────────────────────────────
  createCard(request: CreateCardRequest): LithicCard {
    const lastFour = String(1000 + Math.floor(Math.random() * 9000));
    return {
      token: `card_${uuid()}`,
      account_token: request.account_token,
      type: request.type,
      state: 'OPEN',
      last_four: lastFour,
      pan: `411111111111${lastFour}`,
      cvv: String(100 + Math.floor(Math.random() * 900)),
      exp_month: String(Math.floor(Math.random() * 12) + 1).padStart(2, '0'),
      exp_year: String(new Date().getFullYear() + 3),
      spend_limit: request.spend_limit ?? 0,
      spend_limit_duration: request.spend_limit_duration ?? 'TRANSACTION',
      memo: request.memo,
      created: new Date().toISOString(),
    };
  }

  /** Tell the processor a card's state changed (program-driven freeze/unfreeze/close). */
  async updateCardState(token: string, state: 'OPEN' | 'PAUSED' | 'CLOSED'): Promise<{ token: string; state: string }> {
    return { token, state };
  }

  // ─── Card transaction lifecycle ─────────────────────────────────────────────

  /** AUTHORIZATION: a merchant auth arrives over the network. The program decides via ASA. */
  async authorizeTransaction(input: AuthorizeInput): Promise<{ transaction: LithicTransaction | null; declineReason?: string }> {
    const pan = input.pan.replace(/\s+/g, '');
    const card = await this.repo.findCardByPan(pan);
    if (!card) return { transaction: null, declineReason: 'card_not_found' };

    const token = `txn_${uuid()}`;
    const baseRow = {
      cardId: card.id,
      token,
      amount: input.amount,
      merchantDescriptor: input.merchant.descriptor,
      merchantAcceptorId: input.merchant.acceptorId ?? `acc_${card.id}`,
      merchantMcc: input.merchant.mcc,
      merchantCity: input.merchant.city,
      merchantState: input.merchant.state,
      merchantCountry: input.merchant.country,
      network: NETWORK,
      metadata: JSON.stringify({ merchant: input.merchant, partnerId: input.partnerId }),
    };

    // Processor-level credential checks (wrong expiry/CVV decline before reaching the program).
    let credentialReason: string | undefined;
    if (card.expiryMonth !== input.expMonth.padStart(2, '0') || card.expiryYear !== input.expYear) {
      credentialReason = 'invalid_expiry';
    } else if (card.cvv && card.cvv !== input.cvv) {
      credentialReason = 'invalid_cvv';
    }

    if (credentialReason) {
      const tx = await this.persistAuthorization(card, baseRow, 'DECLINED', 'DECLINED', credentialReason, undefined);
      return { transaction: tx, declineReason: credentialReason };
    }

    // ASA: the program approves (and holds) or declines based on its own ledger.
    const decision = await this.asa.decide(card, input.amount, token);
    if (!decision.approved) {
      const reason = this.partnerReason(decision.result);
      const tx = await this.persistAuthorization(card, baseRow, 'DECLINED', 'DECLINED', reason, decision.result);
      return { transaction: tx, declineReason: reason };
    }

    const authCode = String(100000 + Math.floor(Math.random() * 900000));
    const tx = await this.persistAuthorization(card, { ...baseRow, authorizationAmount: input.amount, authorizationCode: authCode }, 'PENDING', 'APPROVED', undefined, 'APPROVED');
    return { transaction: tx };
  }

  /** CLEARING: the merchant captures (settles) the authorization. Money posts to the ledger. */
  async clearTransaction(token: string, amountMinor?: number): Promise<LithicTransaction> {
    const row = await this.requireTransaction(token, 'PENDING');
    const settled = amountMinor ?? row.amount;
    const event = await this.appendEvent(row.id, 'CLEARING', settled, 'APPROVED');
    const updated = await this.repo.updateTransaction(row.id, { status: 'SETTLED', settledAmount: settled });
    const tx = await this.assemble(updated!);
    await this.dispatch('transaction.updated', tx, event.token);
    return tx;
  }

  /** AUTHORIZATION_REVERSAL: the auth is reversed before clearing; the hold is released. */
  async reverseAuthorization(token: string): Promise<LithicTransaction> {
    const row = await this.requireTransaction(token, 'PENDING');
    const event = await this.appendEvent(row.id, 'AUTHORIZATION_REVERSAL', row.authorizationAmount ?? row.amount, 'APPROVED');
    const updated = await this.repo.updateTransaction(row.id, { status: 'VOIDED' });
    const tx = await this.assemble(updated!);
    await this.dispatch('transaction.updated', tx, event.token);
    return tx;
  }

  /** CREDIT_AUTHORIZATION → RETURN: a merchant credit (refund/return) — money flows to the card. */
  async creditTransaction(partnerId: number, originalToken: string, amountMinor: number): Promise<LithicTransaction> {
    const original = await this.repo.findTransactionByToken(originalToken);
    if (!original) throw new NotFoundException('Original transaction not found');
    // A partner may only refund an authorization it submitted.
    const meta = original.metadata ? JSON.parse(original.metadata) : {};
    if (meta.partnerId != null && meta.partnerId !== partnerId) {
      throw new ForbiddenException('Refund not allowed for this authorization');
    }
    const card = await this.repo.findCardById(original.cardId);
    if (!card) throw new NotFoundException('Card not found');

    const token = `txn_${uuid()}`;
    const row = await this.repo.createTransaction({
      cardId: card.id,
      token,
      amount: amountMinor,
      settledAmount: amountMinor,
      status: 'SETTLED',
      result: 'APPROVED',
      network: NETWORK,
      merchantDescriptor: original.merchantDescriptor,
      merchantAcceptorId: original.merchantAcceptorId,
      merchantMcc: original.merchantMcc,
      metadata: JSON.stringify({ creditFor: originalToken }),
    });
    await this.appendEvent(row.id, 'CREDIT_AUTHORIZATION', amountMinor, 'APPROVED');
    const event = await this.appendEvent(row.id, 'RETURN', amountMinor, 'APPROVED');
    const tx = await this.assemble(row);
    await this.dispatch('transaction.updated', tx, event.token);
    return tx;
  }

  // ─── ACH Payments ───────────────────────────────────────────────────────────

  /** Originate an ACH Payment (DEBIT = pull / CREDIT = push) and run its lifecycle to settlement. */
  async createPayment(input: CreatePaymentInput): Promise<LithicPayment> {
    const existing = await this.repo.findPaymentByIdempotencyKey(input.idempotencyKey);
    if (existing) return this.assemblePayment(existing);

    const token = `pmt_${uuid()}`;
    const row = await this.repo.createPayment({
      token,
      grantId: input.grantId,
      category: 'ACH',
      direction: input.direction,
      method: input.method ?? 'ACH_NEXT_DAY',
      status: 'PENDING',
      amount: input.amount,
      financialAccountToken: input.financialAccountToken,
      externalBankAccountToken: input.externalBankAccountToken,
      idempotencyKey: input.idempotencyKey,
    });
    await this.appendPaymentEvent(row.id, 'ACH_ORIGINATION_INITIATED', input.amount, null);
    await this.appendPaymentEvent(row.id, 'ACH_ORIGINATION_REVIEWED', input.amount, null);
    await this.appendPaymentEvent(row.id, 'ACH_ORIGINATION_PROCESSED', input.amount, null);
    await this.dispatchPayment('payment_transaction.created', await this.assemblePayment(row));

    // Settle (the ledger posts on the settled webhook). If the program's GL post fails (e.g. a
    // DEBIT with insufficient available funds), the origination returns: mark DECLINED and surface it.
    const settledEvent = await this.appendPaymentEvent(row.id, 'ACH_ORIGINATION_SETTLED', input.amount, 'APPROVED');
    const settled = await this.repo.updatePayment(row.id, { status: 'SETTLED', result: 'APPROVED' });
    const payment = await this.assemblePayment(settled!);
    try {
      await this.dispatchPayment('payment_transaction.updated', payment, settledEvent.token);
    } catch (err) {
      await this.repo.updatePayment(row.id, { status: 'RETURNED', result: 'DECLINED' });
      await this.appendPaymentEvent(row.id, 'ACH_RETURN_INITIATED', input.amount, 'DECLINED');
      throw err;
    }
    return payment;
  }

  // ─── helpers ─────────────────────────────────────────────────────────────────

  private async persistAuthorization(
    card: Card,
    base: Record<string, unknown>,
    status: 'PENDING' | 'DECLINED',
    result: 'APPROVED' | 'DECLINED',
    declinedReason: string | undefined,
    eventResult: CardEventResult | undefined,
  ): Promise<LithicTransaction> {
    const row = await this.repo.createTransaction({ ...(base as any), status, result, declinedReason });
    await this.appendEvent(row.id, 'AUTHORIZATION', row.amount, eventResult ?? (result === 'APPROVED' ? 'APPROVED' : 'DECLINED'));
    const tx = await this.assemble(row);
    await this.dispatch('transaction.created', tx, tx.token);
    if (result === 'APPROVED') this.logger.log(`Approved authorization ${row.token} for ${row.amount} at ${card.lithicCardToken}`);
    return tx;
  }

  private async requireTransaction(token: string, expected: CardTransaction['status']): Promise<CardTransaction> {
    const row = await this.repo.findTransactionByToken(token);
    if (!row) throw new NotFoundException(`Transaction not found: ${token}`);
    if (row.status !== expected) throw new BadRequestException(`Transaction ${token} is ${row.status}, expected ${expected}`);
    return row;
  }

  private async appendEvent(cardTransactionId: number, type: CardEventType, amount: number, result: CardEventResult) {
    return this.repo.addTransactionEvent({ cardTransactionId, token: `txnevt_${uuid()}`, type, amount, result });
  }

  private async appendPaymentEvent(paymentId: number, type: LithicPayment['events'][number]['type'], amount: number, result: 'APPROVED' | 'DECLINED' | null) {
    return this.repo.addPaymentEvent({ paymentId, token: `pmtevt_${uuid()}`, type, amount, result });
  }

  /** Build the Lithic Transaction object from the stored row + its events. */
  private async assemble(row: CardTransaction): Promise<LithicTransaction> {
    const card = await this.repo.findCardById(row.cardId);
    const events = await this.repo.eventsForTransactions([row.id]);
    return this.toTransaction(row, events, card);
  }

  toTransaction(row: CardTransaction, events: CardTransactionEvent[], card: Card | null): LithicTransaction {
    const merchant: LithicMerchant = {
      acceptor_id: row.merchantAcceptorId ?? `acc_${row.cardId}`,
      descriptor: row.merchantDescriptor ?? 'UNKNOWN',
      mcc: row.merchantMcc ?? undefined,
      city: row.merchantCity ?? undefined,
      state: row.merchantState ?? undefined,
      country: row.merchantCountry ?? undefined,
    };
    return {
      token: row.token!,
      account_token: card ? `account_${card.accountId}` : '',
      card_token: card?.lithicCardToken ?? '',
      amount: row.amount,
      authorization_amount: row.authorizationAmount ?? 0,
      settled_amount: row.settledAmount ?? 0,
      authorization_code: row.authorizationCode ?? undefined,
      status: row.status,
      result: row.result ?? 'DECLINED',
      network: row.network ?? NETWORK,
      merchant,
      events: events.map((e): LithicTransactionEvent => ({ token: e.token, amount: e.amount, type: e.type, result: e.result, created: e.created.toISOString() })),
      created: row.createdAt.toISOString(),
    };
  }

  private async assemblePayment(row: any): Promise<LithicPayment> {
    const events = await this.repo.eventsForPayment(row.id);
    return {
      token: row.token,
      category: 'ACH',
      direction: row.direction,
      method: row.method,
      status: row.status,
      result: row.result ?? 'APPROVED',
      amount: row.amount,
      financial_account_token: row.financialAccountToken ?? '',
      external_bank_account_token: row.externalBankAccountToken ?? '',
      events: events.map((e) => ({ token: e.token, amount: e.amount, type: e.type, result: e.result as 'APPROVED' | 'DECLINED' | null, created: e.created.toISOString() })),
      created: row.createdAt.toISOString(),
    };
  }

  private partnerReason(result: CardEventResult): string {
    switch (result) {
      case 'INSUFFICIENT_FUNDS': return 'insufficient_funds';
      case 'CARD_PAUSED':
      case 'CARD_CLOSED':
      case 'CARD_NOT_ACTIVATED':
      case 'INACTIVE_ACCOUNT': return 'card_not_active';
      default: return 'declined_by_processor';
    }
  }

  private dispatch(type: 'transaction.created' | 'transaction.updated', tx: LithicTransaction, eventId: string) {
    return this.webhook.processEvent({ id: eventId, type, payload: tx });
  }

  private dispatchPayment(type: 'payment_transaction.created' | 'payment_transaction.updated', payment: LithicPayment, eventId = payment.token) {
    return this.webhook.processEvent({ id: eventId, type, payload: payment });
  }
}
