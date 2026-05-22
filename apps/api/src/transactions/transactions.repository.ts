import { Injectable } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { db, transactions, NewTransaction } from '@mock-bank/database';

@Injectable()
export class TransactionsRepository {
  async create(data: NewTransaction) {
    const [transaction] = await db.insert(transactions).values(data).returning();
    return transaction;
  }

  async findById(id: number) {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || null;
  }

  async findByAccountId(accountId: number) {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.createdAt));
  }

  async updateStatus(id: number, status: 'pending' | 'completed' | 'failed' | 'reversed') {
    const [transaction] = await db
      .update(transactions)
      .set({ status, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async findPendingByAccountId(accountId: number) {
    return db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.accountId, accountId),
        eq(transactions.status, 'pending'),
      ))
      .orderBy(desc(transactions.createdAt));
  }
}
