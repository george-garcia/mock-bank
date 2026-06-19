import { Injectable } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { db, staffSessions, NewStaffSession, StaffSession } from '@mock-bank/database';

@Injectable()
export class StaffSessionsRepository {
  async create(data: NewStaffSession): Promise<StaffSession> {
    const [s] = await db.insert(staffSessions).values(data).returning();
    return s;
  }

  async findByHash(hash: string): Promise<StaffSession | null> {
    const [s] = await db.select().from(staffSessions).where(eq(staffSessions.refreshTokenHash, hash));
    return s ?? null;
  }

  async revoke(id: number, replacedById?: number): Promise<void> {
    await db.update(staffSessions).set({ revokedAt: new Date(), replacedById: replacedById ?? null }).where(eq(staffSessions.id, id));
  }

  async revokeAllForStaff(staffUserId: number): Promise<void> {
    await db
      .update(staffSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(staffSessions.staffUserId, staffUserId), isNull(staffSessions.revokedAt)));
  }
}
