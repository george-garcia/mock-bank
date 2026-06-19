import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { User } from '@mock-bank/database';
import { UsersService } from '../users/users.service';
import { SessionsRepository } from './sessions.repository';

interface SessionContext {
  ip?: string;
  userAgent?: string;
}

export interface IssuedSession {
  user: { id: number; email: string; firstName: string; lastName: string };
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

/**
 * Issues short-lived access tokens (JWT) and opaque, rotating refresh tokens backed by
 * server-side session rows — so a session can be revoked (logout) and refresh-token reuse
 * can be detected. Only a SHA-256 hash of each refresh token is persisted.
 */
@Injectable()
export class SessionService {
  private readonly jwtSecret: string;
  private readonly accessMinutes: number;
  private readonly refreshDays: number;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private repo: SessionsRepository,
    private usersService: UsersService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'mockbank-secret-key');
    this.accessMinutes = Number(this.configService.get<string>('ACCESS_TOKEN_MINUTES', '15'));
    this.refreshDays = Number(this.configService.get<string>('REFRESH_TOKEN_DAYS', '7'));
  }

  async issueForUser(user: User, ctx: SessionContext = {}): Promise<IssuedSession> {
    const { issued } = await this.createSession(user, ctx);
    return issued;
  }

  /** Rotate a refresh token: validate, revoke the old session, issue a fresh one. */
  async refresh(refreshToken: string | undefined, ctx: SessionContext = {}): Promise<IssuedSession> {
    if (!refreshToken) throw new UnauthorizedException('No session');
    const session = await this.repo.findByHash(this.hash(refreshToken));
    if (!session) throw new UnauthorizedException('Invalid session');

    // A revoked (already-rotated) token being presented again signals theft — kill them all.
    if (session.revokedAt) {
      await this.repo.revokeAllForUser(session.userId);
      throw new UnauthorizedException('Session reuse detected');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) throw new UnauthorizedException('Invalid session');

    const { issued, sessionId } = await this.createSession(user, ctx);
    await this.repo.revoke(session.id, sessionId);
    return issued;
  }

  /** Revoke the session for a refresh token (logout). Idempotent. */
  async revoke(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.repo.findByHash(this.hash(refreshToken));
    if (session && !session.revokedAt) {
      await this.repo.revoke(session.id);
    }
  }

  private async createSession(user: User, ctx: SessionContext) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: this.jwtSecret, expiresIn: `${this.accessMinutes}m` },
    );
    const refreshToken = randomBytes(32).toString('hex');
    const refreshMaxAgeMs = this.refreshDays * 24 * 60 * 60 * 1000;

    const session = await this.repo.create({
      userId: user.id,
      refreshTokenHash: this.hash(refreshToken),
      expiresAt: new Date(Date.now() + refreshMaxAgeMs),
      userAgent: ctx.userAgent?.slice(0, 255),
      ip: ctx.ip,
    });

    const issued: IssuedSession = {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      accessToken,
      refreshToken,
      accessMaxAgeMs: this.accessMinutes * 60 * 1000,
      refreshMaxAgeMs,
    };
    return { issued, sessionId: session.id };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
