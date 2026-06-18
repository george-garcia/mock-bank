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

  /** accountId → decimal balance string, for a batch of accounts. */
  async getBalances(accountIds: number[]): Promise<Map<number, string>> {
    const minors = await this.repo.balancesForAccounts(accountIds);
    return new Map([...minors].map(([id, minor]) => [id, toDecimalString(minor)]));
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
