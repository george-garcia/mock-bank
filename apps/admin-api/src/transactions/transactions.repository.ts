import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, ledgerAccounts, ledgerEntries, ledgerTransactions } from '@mock-bank/database';

@Injectable()
export class TransactionsRepository {
  async customerLedgerAccountId(accountId: number): Promise<number | null> {
    const [la] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.accountId, accountId));
    return la?.id ?? null;
  }

  /** Read-only transaction history for a ledger account (newest first), derived from the
   *  immutable ledger entries — the admin app never writes to the ledger. */
  historyForLedgerAccount(ledgerAccountId: number) {
    return db
      .select({
        id: ledgerEntries.id,
        direction: ledgerEntries.direction,
        amountMinor: ledgerEntries.amountMinor,
        createdAt: ledgerEntries.createdAt,
        transactionId: ledgerTransactions.id,
        type: ledgerTransactions.type,
        status: ledgerTransactions.status,
        description: ledgerTransactions.description,
      })
      .from(ledgerEntries)
      .innerJoin(ledgerTransactions, eq(ledgerEntries.transactionId, ledgerTransactions.id))
      .where(eq(ledgerEntries.ledgerAccountId, ledgerAccountId))
      .orderBy(desc(ledgerEntries.createdAt));
  }
}
