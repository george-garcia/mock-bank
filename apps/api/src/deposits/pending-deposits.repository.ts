import { Injectable } from '@nestjs/common';
import { and, eq, inArray, lte, desc } from 'drizzle-orm';
import { db, pendingDeposits, NewPendingDeposit } from '@mock-bank/database';

@Injectable()
export class PendingDepositsRepository {
  async create(data: NewPendingDeposit) {
    const [row] = await db.insert(pendingDeposits).values(data).returning();
    return row;
  }

  /** Pending deposits whose clearAt has passed — ready to post to the ledger. */
  async findDue(now: Date) {
    return db
      .select()
      .from(pendingDeposits)
      .where(and(eq(pendingDeposits.status, 'pending'), lte(pendingDeposits.clearAt, now)))
      .orderBy(pendingDeposits.clearAt);
  }

  async markCleared(id: number, clearedTransactionId: number) {
    await db
      .update(pendingDeposits)
      .set({ status: 'cleared', clearedTransactionId, updatedAt: new Date() })
      .where(eq(pendingDeposits.id, id));
  }

  async findByAccounts(accountIds: number[], status?: 'pending' | 'cleared' | 'failed') {
    if (accountIds.length === 0) return [];
    const where = status
      ? and(inArray(pendingDeposits.accountId, accountIds), eq(pendingDeposits.status, status))
      : inArray(pendingDeposits.accountId, accountIds);
    return db.select().from(pendingDeposits).where(where).orderBy(desc(pendingDeposits.createdAt));
  }
}
