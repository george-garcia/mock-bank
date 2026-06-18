import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, accounts, NewAccount } from '@mock-bank/database';

@Injectable()
export class AccountsRepository {
  async create(data: NewAccount) {
    const [account] = await db.insert(accounts).values(data).returning();
    return account;
  }

  async findById(id: number) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || null;
  }

  async findByUserId(userId: number) {
    return db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(desc(accounts.createdAt));
  }
}
