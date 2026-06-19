import { Injectable } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { toDecimalString } from '../common/money';

@Injectable()
export class TransactionsService {
  constructor(private repo: TransactionsRepository) {}

  /** A customer account's transaction history. Credit = money in (+), debit = money out (−). */
  async historyForAccount(accountId: number) {
    const ledgerAccountId = await this.repo.customerLedgerAccountId(accountId);
    if (!ledgerAccountId) return [];
    const rows = await this.repo.historyForLedgerAccount(ledgerAccountId);
    return rows.map((r) => ({
      id: r.id,
      accountId,
      transactionId: r.transactionId,
      type: r.type,
      amount: toDecimalString(r.direction === 'credit' ? r.amountMinor : -r.amountMinor),
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }
}
