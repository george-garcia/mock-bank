import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db, otpCodes, NewOtpCode, OtpCode } from '@mock-bank/database';

type OtpPurpose = 'login' | 'enable';

@Injectable()
export class TwoFactorRepository {
  async create(data: NewOtpCode): Promise<OtpCode> {
    const [code] = await db.insert(otpCodes).values(data).returning();
    return code;
  }

  /** The most recent unconsumed, unexpired code for a user+purpose, if any. */
  async findActive(userId: number, purpose: OtpPurpose, now: Date): Promise<OtpCode | null> {
    const [code] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.purpose, purpose),
          isNull(otpCodes.consumedAt),
          gt(otpCodes.expiresAt, now),
        ),
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return code || null;
  }

  async incrementAttempts(id: number): Promise<void> {
    const [code] = await db.select().from(otpCodes).where(eq(otpCodes.id, id));
    if (!code) return;
    await db
      .update(otpCodes)
      .set({ attempts: code.attempts + 1 })
      .where(eq(otpCodes.id, id));
  }

  async markConsumed(id: number, now: Date): Promise<void> {
    await db.update(otpCodes).set({ consumedAt: now }).where(eq(otpCodes.id, id));
  }

  /** Invalidate any outstanding codes of a purpose before issuing a fresh one. */
  async consumeOutstanding(userId: number, purpose: OtpPurpose, now: Date): Promise<void> {
    await db
      .update(otpCodes)
      .set({ consumedAt: now })
      .where(
        and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.purpose, purpose),
          isNull(otpCodes.consumedAt),
        ),
      );
  }
}
