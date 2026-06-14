import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcryptjs from 'bcryptjs';
import { randomInt } from 'crypto';
import { User } from '@mock-bank/database';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { TwoFactorRepository } from './two-factor.repository';

const MAX_OTP_ATTEMPTS = 5;
const CHALLENGE_TYPE = '2fa';

interface ChallengePayload {
  sub: number;
  typ: typeof CHALLENGE_TYPE;
  mth: 'email' | 'totp';
}

@Injectable()
export class TwoFactorService {
  private readonly otpLength: number;
  private readonly otpExpMinutes: number;
  private readonly issuer: string;
  private readonly challengeExpiresIn: string;
  private readonly jwtSecret: string;

  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private twoFactorRepository: TwoFactorRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.otpLength = Number(this.configService.get<string>('OTP_LENGTH', '6'));
    this.otpExpMinutes = Number(this.configService.get<string>('OTP_EXP_MINUTES', '10'));
    this.issuer = this.configService.get<string>('TOTP_ISSUER', 'Mock Bank');
    this.challengeExpiresIn = this.configService.get<string>('TWO_FA_CHALLENGE_EXP', '10m');
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'mockbank-secret-key');
  }

  // ---- Status -------------------------------------------------------------

  async getStatus(userId: number) {
    const user = await this.requireUser(userId);
    return {
      method: user.twoFactorMethod,
      enabled: user.twoFactorMethod !== 'none',
    };
  }

  // ---- Authenticator (TOTP) ----------------------------------------------

  async setupTotp(userId: number) {
    const user = await this.requireUser(userId);
    this.ensureNoActiveMethod(user);

    const secret = authenticator.generateSecret();
    // Persist the candidate secret; it only becomes active once enableTotp verifies a code.
    await this.usersService.update(userId, { totpSecret: secret });

    const otpauthUrl = authenticator.keyuri(user.email, this.issuer, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async enableTotp(userId: number, code: string) {
    const user = await this.requireUser(userId);
    if (user.twoFactorMethod === 'totp') {
      throw new ConflictException('Authenticator is already enabled');
    }
    this.ensureNoActiveMethod(user);
    if (!user.totpSecret) {
      throw new BadRequestException('Start authenticator setup first');
    }
    if (!authenticator.check(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    await this.usersService.setTwoFactor(userId, { method: 'totp' });
    return { method: 'totp' as const };
  }

  // ---- Email OTP ----------------------------------------------------------

  /** Send a code so the user can enable (or, when already enabled, disable) email 2FA. */
  async setupEmail(userId: number) {
    const user = await this.requireUser(userId);
    if (user.twoFactorMethod === 'totp') {
      throw new ConflictException('Disable the authenticator before enabling email 2FA');
    }
    await this.issueEmailCode(user, 'enable');
    return { sent: true };
  }

  async enableEmail(userId: number, code: string) {
    const user = await this.requireUser(userId);
    if (user.twoFactorMethod === 'email') {
      throw new ConflictException('Email 2FA is already enabled');
    }
    this.ensureNoActiveMethod(user);
    await this.verifyEmailCode(userId, code, 'enable');

    await this.usersService.setTwoFactor(userId, { method: 'email' });
    return { method: 'email' as const };
  }

  // ---- Disable ------------------------------------------------------------

  async disable(userId: number, code: string) {
    const user = await this.requireUser(userId);
    if (user.twoFactorMethod === 'none') {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    if (user.twoFactorMethod === 'totp') {
      if (!user.totpSecret || !authenticator.check(code, user.totpSecret)) {
        throw new UnauthorizedException('Invalid authenticator code');
      }
    } else {
      // email — verify a code previously requested via setupEmail
      await this.verifyEmailCode(userId, code, 'enable');
    }

    await this.usersService.setTwoFactor(userId, { method: 'none', totpSecret: null });
    return { method: 'none' as const };
  }

  // ---- Login challenge ----------------------------------------------------

  /** Called from AuthService when a user with 2FA enabled passes the password check. */
  async issueLoginChallenge(user: User) {
    const method = user.twoFactorMethod as 'email' | 'totp';
    const payload: ChallengePayload = { sub: user.id, typ: CHALLENGE_TYPE, mth: method };
    const challengeToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.challengeExpiresIn,
    });

    if (method === 'email') {
      await this.issueEmailCode(user, 'login');
    }

    return { requiresTwoFactor: true as const, method, challengeToken };
  }

  /** Verify a login challenge and issue the real session (same shape as AuthService.login). */
  async completeLogin(challengeToken: string, code: string) {
    const user = await this.verifyLoginChallenge(challengeToken, code);
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: this.jwtSecret, expiresIn: '7d' },
    );
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
    };
  }

  /** Verify a login challenge and return the authenticated user on success. */
  async verifyLoginChallenge(challengeToken: string, code: string): Promise<User> {
    let payload: ChallengePayload;
    try {
      payload = this.jwtService.verify<ChallengePayload>(challengeToken, {
        secret: this.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired challenge');
    }
    if (payload.typ !== CHALLENGE_TYPE) {
      throw new UnauthorizedException('Invalid challenge');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.twoFactorMethod === 'none') {
      throw new UnauthorizedException('Invalid challenge');
    }

    if (user.twoFactorMethod === 'totp') {
      if (!user.totpSecret || !authenticator.check(code, user.totpSecret)) {
        throw new UnauthorizedException('Invalid authenticator code');
      }
    } else {
      await this.verifyEmailCode(user.id, code, 'login');
    }

    return user;
  }

  // ---- Helpers ------------------------------------------------------------

  private async issueEmailCode(user: User, purpose: 'login' | 'enable') {
    const now = new Date();
    await this.twoFactorRepository.consumeOutstanding(user.id, purpose, now);

    const code = this.generateNumericCode();
    const codeHash = await bcryptjs.hash(code, 10);
    const expiresAt = new Date(now.getTime() + this.otpExpMinutes * 60_000);

    await this.twoFactorRepository.create({
      userId: user.id,
      codeHash,
      purpose,
      expiresAt,
    });

    await this.emailService.sendOtp(user.email, code);
  }

  private async verifyEmailCode(userId: number, code: string, purpose: 'login' | 'enable') {
    const now = new Date();
    const record = await this.twoFactorRepository.findActive(userId, purpose, now);
    if (!record) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts — request a new code');
    }

    const matches = await bcryptjs.compare(code, record.codeHash);
    if (!matches) {
      await this.twoFactorRepository.incrementAttempts(record.id);
      throw new UnauthorizedException('Invalid code');
    }

    await this.twoFactorRepository.markConsumed(record.id, now);
  }

  private async requireUser(userId: number): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private generateNumericCode(): string {
    let code = '';
    for (let i = 0; i < this.otpLength; i++) {
      code += randomInt(0, 10).toString();
    }
    return code;
  }

  private ensureNoActiveMethod(user: User) {
    if (user.twoFactorMethod !== 'none') {
      throw new ConflictException(
        'Disable the current two-factor method before enabling another',
      );
    }
  }
}
