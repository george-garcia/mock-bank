import { Injectable, BadRequestException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';

interface RecordInput {
  accountId: number;
  type: string;
  amount: string;
  description?: string;
  idempotencyKey?: string;
}

/**
 * Transactions are not a table you write to directly — they're derived from the immutable
 * ledger. This service exposes per-account history and a thin record path that posts a
 * deposit/withdrawal through the ledger (kept for API compatibility).
 */
@Injectable()
export class TransactionsService {
  constructor(
    private accountsService: AccountsService,
    private ledgerService: LedgerService,
  ) {}

  async recordTransaction(userId: number, data: RecordInput) {
    await this.accountsService.findOne(data.accountId, userId); // ownership check

    const move = { amount: data.amount, description: data.description, idempotencyKey: data.idempotencyKey };
    if (data.type === 'deposit') {
      return this.ledgerService.deposit(data.accountId, move);
    }
    if (data.type === 'withdrawal') {
      return this.ledgerService.withdraw(data.accountId, move);
    }
    throw new BadRequestException(
      `Unsupported transaction type "${data.type}". Use the deposits, withdrawals, or transfers endpoints.`,
    );
  }

  async findByAccountId(accountId: number, userId: number) {
    await this.accountsService.findOne(accountId, userId); // ownership check
    return this.ledgerService.historyForAccount(accountId);
  }
}
