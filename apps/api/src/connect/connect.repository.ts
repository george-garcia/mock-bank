import { Injectable } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import {
  db,
  partners,
  connectLinkSessions,
  connectGrants,
  NewConnectLinkSession,
  NewConnectGrant,
} from '@mock-bank/database';

/** Persistence for the Connect flow: link sessions and access grants. */
@Injectable()
export class ConnectRepository {
  async createLinkSession(values: NewConnectLinkSession) {
    const [row] = await db.insert(connectLinkSessions).values(values).returning();
    return row;
  }

  async findLinkSessionByLinkToken(linkToken: string) {
    const [row] = await db.select().from(connectLinkSessions).where(eq(connectLinkSessions.linkToken, linkToken));
    return row || null;
  }

  async findLinkSessionByPublicToken(publicToken: string) {
    const [row] = await db.select().from(connectLinkSessions).where(eq(connectLinkSessions.publicToken, publicToken));
    return row || null;
  }

  async updateLinkSession(id: number, patch: Partial<NewConnectLinkSession>) {
    const [row] = await db
      .update(connectLinkSessions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(connectLinkSessions.id, id))
      .returning();
    return row;
  }

  async findPartnerName(partnerId: number): Promise<string | null> {
    const [row] = await db.select({ name: partners.name }).from(partners).where(eq(partners.id, partnerId));
    return row?.name ?? null;
  }

  async createGrant(values: NewConnectGrant) {
    const [row] = await db.insert(connectGrants).values(values).returning();
    return row;
  }

  async findActiveGrantByHash(accessTokenHash: string) {
    const [row] = await db
      .select()
      .from(connectGrants)
      .where(and(eq(connectGrants.accessTokenHash, accessTokenHash), isNull(connectGrants.revokedAt)));
    return row || null;
  }
}
