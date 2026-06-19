import { Injectable } from '@nestjs/common';
import { eq, desc, inArray } from 'drizzle-orm';
import { db, accounts, ledgerAccounts, users } from '@mock-bank/database';

@Injectable()
export class AccountsRepository {
  /** All accounts with their owner's basic info. */
  findAllWithOwner() {
    return db
      .select({
        id: accounts.id,
        userId: accounts.userId,
        type: accounts.type,
        status: accounts.status,
        createdAt: accounts.createdAt,
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
        ownerEmail: users.email,
      })
      .from(accounts)
      .innerJoin(users, eq(users.id, accounts.userId))
      .orderBy(desc(accounts.createdAt));
  }

  findByUserId(userId: number) {
    return db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(desc(accounts.createdAt));
  }

  async findById(id: number) {
    const [a] = await db.select().from(accounts).where(eq(accounts.id, id));
    return a || null;
  }

  async updateStatus(id: number, status: 'active' | 'frozen' | 'closed') {
    const [a] = await db.update(accounts).set({ status, updatedAt: new Date() }).where(eq(accounts.id, id)).returning();
    return a || null;
  }

  /** accountId → cached posted balance (minor units), read from the backing ledger account. */
  async balancesFor(accountIds: number[]): Promise<Map<number, number>> {
    if (accountIds.length === 0) return new Map();
    const rows = await db
      .select({ accountId: ledgerAccounts.accountId, bal: ledgerAccounts.balanceMinor })
      .from(ledgerAccounts)
      .where(inArray(ledgerAccounts.accountId, accountIds));
    return new Map(rows.filter((r) => r.accountId !== null).map((r) => [r.accountId as number, r.bal]));
  }
}
