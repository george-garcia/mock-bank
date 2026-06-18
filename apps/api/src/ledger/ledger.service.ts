import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { toMinor, toDecimalString } from '../common/money';
import { LedgerRepository } from './ledger.repository';

interface MoveInput {
  amount: string;
  idempotencyKey?: string;
  description?: string;
}

/**
 * High-level money movement, expressed as double-entry journals posted atomically by the
 * LedgerRepository. Internal GL accounts: 'bank_cash' (asset), 'card_network' (clearing).
 * Customer deposit accounts are liabilities (credit-normal): a credit increases the
 * customer's balance, a debit decreases it.
 */
@Injectable()
export class LedgerService {
  constructor(private repo: LedgerRepository) {}

  /** Create the ledger account that backs a new customer bank account. */
  async openCustomerAccount(accountId: number, type: string) {
    return this.repo.createCustomerLedgerAccount(accountId, `Customer ${type} #${accountId}`);
  }

  async getBalance(accountId: number): Promise<string> {
    return toDecimalString(await this.repo.balanceMinorForAccount(accountId));
  }

  /** accountId → { balance (posted), available (posted − active holds) } decimal strings. */
  async getBalances(accountIds: number[]): Promise<Map<number, { balance: string; available: string }>> {
    const posted = await this.repo.balancesForAccounts(accountIds);
    const heldMap = await this.repo.activeHoldsForAccounts(accountIds);
    return new Map(
      [...posted].map(([id, minor]) => {
        const held = heldMap.get(id) ?? 0;
        return [id, { balance: toDecimalString(minor), available: toDecimalString(minor - held) }];
      }),
    );
  }

  async getAvailableBalance(accountId: number): Promise<string> {
    const posted = await this.repo.balanceMinorForAccount(accountId);
    const held = (await this.repo.activeHoldsForAccounts([accountId])).get(accountId) ?? 0;
    return toDecimalString(posted - held);
  }

  // ─── Holds (available-balance reservations) ───────────────────────────────

  async placeHold(accountId: number, input: { amount: string; externalRef?: string; expiresAt?: Date; metadata?: Record<string, unknown> }) {
    const minor = this.requirePositive(input.amount);
    const ledgerAccountId = await this.requireCustomer(accountId);
    return this.repo.placeHold({
      ledgerAccountId,
      amountMinor: minor,
      type: 'card_auth',
      externalRef: input.externalRef,
      expiresAt: input.expiresAt,
      metadata: input.metadata,
    });
  }

  releaseHold(externalRef: string) {
    return this.repo.resolveHold(externalRef, 'released');
  }

  captureHold(externalRef: string) {
    return this.repo.resolveHold(externalRef, 'captured');
  }

  async deposit(accountId: number, input: MoveInput, type: 'deposit' = 'deposit') {
    const minor = this.requirePositive(input.amount);
    const customer = await this.requireCustomer(accountId);
    const cash = await this.repo.systemLedgerAccountId('bank_cash');
    return this.repo.post({
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      type,
      description: input.description,
      entries: [
        { ledgerAccountId: cash, direction: 'debit', amountMinor: minor },
        { ledgerAccountId: customer, direction: 'credit', amountMinor: minor },
      ],
    });
  }

  async withdraw(accountId: number, input: MoveInput) {
    const minor = this.requirePositive(input.amount);
    const customer = await this.requireCustomer(accountId);
    const cash = await this.repo.systemLedgerAccountId('bank_cash');
    return this.repo.post({
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      type: 'withdrawal',
      description: input.description,
      entries: [
        { ledgerAccountId: customer, direction: 'debit', amountMinor: minor },
        { ledgerAccountId: cash, direction: 'credit', amountMinor: minor },
      ],
    });
  }

  async transfer(fromAccountId: number, toAccountId: number, input: MoveInput) {
    if (fromAccountId === toAccountId) {
      throw new BadRequestException('Cannot transfer to the same account');
    }
    const minor = this.requirePositive(input.amount);
    const from = await this.requireCustomer(fromAccountId);
    const to = await this.requireCustomer(toAccountId);
    return this.repo.post({
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      type: 'transfer',
      description: input.description,
      metadata: { fromAccountId, toAccountId },
      entries: [
        { ledgerAccountId: from, direction: 'debit', amountMinor: minor },
        { ledgerAccountId: to, direction: 'credit', amountMinor: minor },
      ],
    });
  }

  /** Forced post: a settlement clears even if it overdraws the account (P1 adds holds). */
  async cardSettlement(accountId: number, input: MoveInput) {
    const minor = this.requirePositive(input.amount);
    const customer = await this.requireCustomer(accountId);
    const network = await this.repo.systemLedgerAccountId('card_network');
    return this.repo.post({
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      type: 'card_settlement',
      description: input.description,
      allowNegative: true,
      entries: [
        { ledgerAccountId: customer, direction: 'debit', amountMinor: minor },
        { ledgerAccountId: network, direction: 'credit', amountMinor: minor },
      ],
    });
  }

  /** Per-account history, derived from immutable ledger entries (API-compatible shape). */
  async historyForAccount(accountId: number) {
    const rows = await this.repo.historyForAccount(accountId);
    return rows.map((r) => ({
      id: r.id,
      accountId,
      transactionId: r.transactionId,
      type: r.type,
      // Customer accounts are credit-normal: credit = money in (+), debit = money out (−).
      amount: toDecimalString(r.direction === 'credit' ? r.amountMinor : -r.amountMinor),
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  private requirePositive(amount: string): number {
    let minor: number;
    try {
      minor = toMinor(amount);
    } catch {
      throw new BadRequestException(`Invalid amount: "${amount}"`);
    }
    if (minor <= 0) throw new BadRequestException('Amount must be greater than zero');
    return minor;
  }

  private async requireCustomer(accountId: number): Promise<number> {
    const id = await this.repo.customerLedgerAccountId(accountId);
    if (!id) throw new NotFoundException('Account not found');
    return id;
  }
}
