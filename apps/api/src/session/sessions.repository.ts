import { Injectable } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { db, sessions, NewSession, Session } from '@mock-bank/database';

@Injectable()
export class SessionsRepository {
  async create(data: NewSession): Promise<Session> {
    const [s] = await db.insert(sessions).values(data).returning();
    return s;
  }

  async findByHash(hash: string): Promise<Session | null> {
    const [s] = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, hash));
    return s ?? null;
  }

  async revoke(id: number, replacedById?: number): Promise<void> {
    await db
      .update(sessions)
      .set({ revokedAt: new Date(), replacedById: replacedById ?? null })
      .where(eq(sessions.id, id));
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }
}
