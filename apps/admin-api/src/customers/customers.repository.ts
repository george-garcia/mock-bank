import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, users, NewUser } from '@mock-bank/database';

@Injectable()
export class CustomersRepository {
  findAll() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async findById(id: number) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u || null;
  }

  async findByEmail(email: string) {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u || null;
  }

  async update(id: number, data: Partial<NewUser>) {
    const [u] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return u || null;
  }
}
