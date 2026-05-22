import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, users, NewUser } from '@mock-bank/database';

@Injectable()
export class UsersRepository {
  async create(data: NewUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async findById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }
}
