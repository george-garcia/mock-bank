import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../session/session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private twoFactorService: TwoFactorService,
    private auditService: AuditService,
    private sessionService: SessionService,
  ) {}

  async register(dto: RegisterDto, ctx: RequestContext = {}) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcryptjs.hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, passwordHash });

    await this.auditService.record({ actorType: 'customer', actorUserId: user.id, action: 'auth.register', ...this.ctxMeta(ctx) });
    const session = await this.sessionService.issueForUser(user, ctx);
    return { user: session.user, session };
  }

  async login(dto: LoginDto, ctx: RequestContext = {}) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.auditService.record({ actorType: 'customer', action: 'auth.login_failed', metadata: { email: dto.email, reason: 'unknown_user' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reject while the account is locked from prior failed attempts.
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.auditService.record({
        actorType: 'customer',
        actorUserId: user.id,
        action: 'auth.login_blocked',
        metadata: { reason: 'account_locked', lockedUntil: user.lockedUntil.toISOString() },
      });
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const isValid = await bcryptjs.compare(dto.password, user.passwordHash);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const locked = attempts >= MAX_FAILED_LOGINS;
      await this.usersService.update(user.id, {
        failedLoginAttempts: attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      });
      await this.auditService.record({
        actorType: 'customer',
        actorUserId: user.id,
        action: locked ? 'auth.account_locked' : 'auth.login_failed',
        metadata: { reason: 'bad_password', attempts },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful password check — clear any failed-attempt state.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.usersService.update(user.id, { failedLoginAttempts: 0, lockedUntil: null });
    }

    // When 2FA is enabled, withhold the session and issue a challenge instead.
    if (user.twoFactorMethod !== 'none') {
      await this.auditService.record({ actorType: 'customer', actorUserId: user.id, action: 'auth.login_2fa_challenge' });
      return this.twoFactorService.issueLoginChallenge(user);
    }

    await this.auditService.record({ actorType: 'customer', actorUserId: user.id, action: 'auth.login', ...this.ctxMeta(ctx) });
    const session = await this.sessionService.issueForUser(user, ctx);
    return { user: session.user, session };
  }

  private ctxMeta(ctx: RequestContext) {
    return { ip: ctx.ip };
  }
}
