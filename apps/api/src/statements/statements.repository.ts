import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, statements, NewStatement } from '@mock-bank/database';

@Injectable()
export class StatementsRepository {
  async create(data: NewStatement) {
    const [s] = await db.insert(statements).values(data).returning();
    return s;
  }

  async findById(id: number) {
    const [s] = await db.select().from(statements).where(eq(statements.id, id));
    return s ?? null;
  }

  async findByAccount(accountId: number) {
    return db.select().from(statements).where(eq(statements.accountId, accountId)).orderBy(desc(statements.periodStart));
  }
}
