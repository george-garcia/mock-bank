import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcryptjs from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private twoFactorService: TwoFactorService,
    private auditService: AuditService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcryptjs.hash(dto.password, 10);
    const user = await this.usersService.create({
      ...dto,
      passwordHash,
    });

    const token = this.generateToken(user.id, user.email);

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

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.auditService.record({ action: 'auth.login_failed', metadata: { email: dto.email, reason: 'unknown_user' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcryptjs.compare(dto.password, user.passwordHash);
    if (!isValid) {
      await this.auditService.record({ actorUserId: user.id, action: 'auth.login_failed', metadata: { reason: 'bad_password' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // When 2FA is enabled, withhold the session token and issue a challenge instead.
    if (user.twoFactorMethod !== 'none') {
      await this.auditService.record({ actorUserId: user.id, action: 'auth.login_2fa_challenge' });
      return this.twoFactorService.issueLoginChallenge(user);
    }

    await this.auditService.record({ actorUserId: user.id, action: 'auth.login' });
    const token = this.generateToken(user.id, user.email);

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

  private generateToken(userId: number, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.configService.get<string>('JWT_SECRET', 'mockbank-secret-key'),
        expiresIn: '7d',
      },
    );
  }
}
