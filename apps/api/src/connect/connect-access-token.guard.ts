import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConnectGrant } from '@mock-bank/database';
import { ConnectRepository } from './connect.repository';

/**
 * Authenticates a partner acting on a linked account via a Connect access token
 * (`Authorization: Bearer access-...`). The token maps to a durable grant scoped to one
 * customer account; only its sha256 hash is stored.
 */
@Injectable()
export class ConnectAccessTokenGuard implements CanActivate {
  constructor(private connectRepository: ConnectRepository) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers?.['authorization'];
    const token = typeof header === 'string' && header.toLowerCase().startsWith('bearer ')
      ? header.slice(7).trim()
      : null;
    if (!token) throw new UnauthorizedException('Missing Connect access token');

    const hash = createHash('sha256').update(token).digest('hex');
    const grant = await this.connectRepository.findActiveGrantByHash(hash);
    if (!grant) throw new UnauthorizedException('Invalid Connect access token');

    req.connectGrant = grant;
    return true;
  }
}

/** Param decorator to read the grant attached by ConnectAccessTokenGuard. */
import { createParamDecorator } from '@nestjs/common';
export const CurrentGrant = createParamDecorator((_data: unknown, ctx: ExecutionContext): ConnectGrant => {
  return ctx.switchToHttp().getRequest().connectGrant;
});
