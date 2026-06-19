import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { StaffUser } from '@mock-bank/database';
import { StaffRepository } from './staff.repository';
import { StaffSessionsRepository } from './staff-sessions.repository';

interface SessionContext {
  ip?: string;
  userAgent?: string;
}

export interface IssuedStaffSession {
  staff: { id: number; email: string; firstName: string; lastName: string; role: string };
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

/** Staff session store for the admin panel — independent of the bank app's customer sessions. */
@Injectable()
export class StaffSessionService {
  private readonly jwtSecret: string;
  private readonly accessMinutes: number;
  private readonly refreshDays: number;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private repo: StaffSessionsRepository,
    private staffRepo: StaffRepository,
  ) {
    this.jwtSecret = this.configService.get<string>('ADMIN_JWT_SECRET') || this.configService.get<string>('JWT_SECRET', 'admin-secret-key');
    this.accessMinutes = Number(this.configService.get<string>('ACCESS_TOKEN_MINUTES', '15'));
    this.refreshDays = Number(this.configService.get<string>('REFRESH_TOKEN_DAYS', '7'));
  }

  async issueForStaff(staff: StaffUser, ctx: SessionContext = {}): Promise<IssuedStaffSession> {
    return (await this.createSession(staff, ctx)).issued;
  }

  async refresh(refreshToken: string | undefined, ctx: SessionContext = {}): Promise<IssuedStaffSession> {
    if (!refreshToken) throw new UnauthorizedException('No session');
    const session = await this.repo.findByHash(this.hash(refreshToken));
    if (!session) throw new UnauthorizedException('Invalid session');
    if (session.revokedAt) {
      await this.repo.revokeAllForStaff(session.staffUserId);
      throw new UnauthorizedException('Session reuse detected');
    }
    if (session.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Session expired');

    const staff = await this.staffRepo.findById(session.staffUserId);
    if (!staff) throw new UnauthorizedException('Invalid session');

    const { issued, sessionId } = await this.createSession(staff, ctx);
    await this.repo.revoke(session.id, sessionId);
    return issued;
  }

  async revoke(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.repo.findByHash(this.hash(refreshToken));
    if (session && !session.revokedAt) await this.repo.revoke(session.id);
  }

  private async createSession(staff: StaffUser, ctx: SessionContext) {
    const accessToken = this.jwtService.sign(
      { sub: staff.id, email: staff.email, role: staff.role, typ: 'staff' },
      { secret: this.jwtSecret, expiresIn: `${this.accessMinutes}m` },
    );
    const refreshToken = randomBytes(32).toString('hex');
    const refreshMaxAgeMs = this.refreshDays * 24 * 60 * 60 * 1000;

    const session = await this.repo.create({
      staffUserId: staff.id,
      refreshTokenHash: this.hash(refreshToken),
      expiresAt: new Date(Date.now() + refreshMaxAgeMs),
      userAgent: ctx.userAgent?.slice(0, 255),
      ip: ctx.ip,
    });

    const issued: IssuedStaffSession = {
      staff: { id: staff.id, email: staff.email, firstName: staff.firstName, lastName: staff.lastName, role: staff.role },
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
