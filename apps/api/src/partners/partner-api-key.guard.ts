import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PartnersRepository } from './partners.repository';

/** The partner identity attached to the request once an API key is verified. */
export interface AuthenticatedPartner {
  id: number;
  name: string;
  kind: string;
}

/**
 * Authenticates server-to-server partner requests (the card "Network" and "Connect" APIs) by a
 * secret API key, presented as `Authorization: Bearer sk_...` or `X-Api-Key: sk_...`. Only the
 * sha256 hash is compared against the stored hash — the plaintext key is never persisted.
 */
@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private partnersRepository: PartnersRepository) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const key = extractKey(req);
    if (!key) throw new UnauthorizedException('Missing partner API key');

    const keyHash = createHash('sha256').update(key).digest('hex');
    const row = await this.partnersRepository.findActiveKeyByHash(keyHash);
    if (!row) throw new UnauthorizedException('Invalid partner API key');

    req.partner = { id: row.partnerId, name: row.partnerName, kind: row.partnerKind } as AuthenticatedPartner;
    return true;
  }
}

function extractKey(req: any): string | null {
  const header = req.headers?.['authorization'];
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const apiKey = req.headers?.['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.length > 0) return apiKey.trim();
  return null;
}
