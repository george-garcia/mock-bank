import { Injectable } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { db, partners, partnerApiKeys } from '@mock-bank/database';

/** Read-side access to partners (third-party companies integrating over the public APIs). */
@Injectable()
export class PartnersRepository {
  /** Resolve an active (non-revoked) API key by its sha256 hash to its owning partner. */
  async findActiveKeyByHash(keyHash: string) {
    const [row] = await db
      .select({
        partnerId: partnerApiKeys.partnerId,
        partnerName: partners.name,
        partnerKind: partners.kind,
      })
      .from(partnerApiKeys)
      .innerJoin(partners, eq(partners.id, partnerApiKeys.partnerId))
      .where(and(eq(partnerApiKeys.keyHash, keyHash), isNull(partnerApiKeys.revokedAt)));
    return row ?? null;
  }
}
