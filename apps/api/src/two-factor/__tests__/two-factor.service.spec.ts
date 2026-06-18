import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcryptjs from 'bcryptjs';
import { TwoFactorService } from '../two-factor.service';
import { UsersService } from '../../users/users.service';
import { EmailService } from '../../email/email.service';
import { TwoFactorRepository } from '../two-factor.repository';

jest.mock('bcryptjs');
jest.mock('otplib');
jest.mock('qrcode');

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let usersService: jest.Mocked<Pick<UsersService, 'findById' | 'update' | 'setTwoFactor'>>;
  let emailService: jest.Mocked<Pick<EmailService, 'sendOtp'>>;
  let repo: jest.Mocked<
    Pick<TwoFactorRepository, 'create' | 'findActive' | 'incrementAttempts' | 'markConsumed' | 'consumeOutstanding'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;

  const baseUser = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hash',
    twoFactorMethod: 'none' as 'none' | 'email' | 'totp',
    totpSecret: null as string | null,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const user = (overrides: Partial<typeof baseUser> = {}) => ({ ...baseUser, ...overrides });

  beforeEach(async () => {
    jest.clearAllMocks();
    usersService = { findById: jest.fn(), update: jest.fn(), setTwoFactor: jest.fn() };
    emailService = { sendOtp: jest.fn() };
    repo = {
      create: jest.fn(),
      findActive: jest.fn(),
      incrementAttempts: jest.fn(),
      markConsumed: jest.fn(),
      consumeOutstanding: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token'), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: UsersService, useValue: usersService },
        { provide: EmailService, useValue: emailService },
        { provide: TwoFactorRepository, useValue: repo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: (_k: string, d?: string) => d } },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    (bcryptjs.hash as jest.Mock).mockResolvedValue('code-hash');
  });

  describe('setupTotp', () => {
    it('generates a secret + QR and persists the candidate secret', async () => {
      usersService.findById.mockResolvedValue(user());
      (authenticator.generateSecret as jest.Mock).mockReturnValue('SECRET');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://totp/x');
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,abc');

      const result = await service.setupTotp(1);

      expect(usersService.update).toHaveBeenCalledWith(1, { totpSecret: 'SECRET' });
      expect(result).toEqual({
        secret: 'SECRET',
        otpauthUrl: 'otpauth://totp/x',
        qrCodeDataUrl: 'data:image/png;base64,abc',
      });
    });

    it('rejects setup when another method is already active', async () => {
      usersService.findById.mockResolvedValue(user({ twoFactorMethod: 'email' }));
      await expect(service.setupTotp(1)).rejects.toThrow(ConflictException);
    });
  });

  describe('enableTotp', () => {
    it('enables when the code is valid', async () => {
      usersService.findById.mockResolvedValue(user({ totpSecret: 'SECRET' }));
      (authenticator.check as jest.Mock).mockReturnValue(true);

      const result = await service.enableTotp(1, '123456');

      expect(authenticator.check).toHaveBeenCalledWith('123456', 'SECRET');
      expect(usersService.setTwoFactor).toHaveBeenCalledWith(1, { method: 'totp' });
      expect(result).toEqual({ method: 'totp' });
    });

    it('rejects an invalid code', async () => {
      usersService.findById.mockResolvedValue(user({ totpSecret: 'SECRET' }));
      (authenticator.check as jest.Mock).mockReturnValue(false);
      await expect(service.enableTotp(1, '000000')).rejects.toThrow(UnauthorizedException);
      expect(usersService.setTwoFactor).not.toHaveBeenCalled();
    });

    it('rejects when setup has not been started', async () => {
      usersService.findById.mockResolvedValue(user({ totpSecret: null }));
      await expect(service.enableTotp(1, '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('setupEmail', () => {
    it('issues and emails a code', async () => {
      usersService.findById.mockResolvedValue(user());
      const result = await service.setupEmail(1);

      expect(repo.consumeOutstanding).toHaveBeenCalledWith(1, 'enable', expect.any(Date));
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, purpose: 'enable', codeHash: 'code-hash' }),
      );
      expect(emailService.sendOtp).toHaveBeenCalledWith('test@example.com', expect.any(String));
      expect(result).toEqual({ sent: true });
    });

    it('rejects when authenticator is active', async () => {
      usersService.findById.mockResolvedValue(user({ twoFactorMethod: 'totp' }));
      await expect(service.setupEmail(1)).rejects.toThrow(ConflictException);
    });
  });

  describe('enableEmail / verifyEmailCode', () => {
    it('enables email 2FA with a valid code', async () => {
      usersService.findById.mockResolvedValue(user());
      repo.findActive.mockResolvedValue({
        id: 9,
        userId: 1,
        codeHash: 'code-hash',
        purpose: 'enable',
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(),
      });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.enableEmail(1, '123456');

      expect(repo.markConsumed).toHaveBeenCalledWith(9, expect.any(Date));
      expect(usersService.setTwoFactor).toHaveBeenCalledWith(1, { method: 'email' });
      expect(result).toEqual({ method: 'email' });
    });

    it('rejects when no active code exists', async () => {
      usersService.findById.mockResolvedValue(user());
      repo.findActive.mockResolvedValue(null);
      await expect(service.enableEmail(1, '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('increments attempts and rejects on a wrong code', async () => {
      usersService.findById.mockResolvedValue(user());
      repo.findActive.mockResolvedValue({
        id: 9,
        userId: 1,
        codeHash: 'code-hash',
        purpose: 'enable',
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: null,
        attempts: 1,
        createdAt: new Date(),
      });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.enableEmail(1, '999999')).rejects.toThrow(UnauthorizedException);
      expect(repo.incrementAttempts).toHaveBeenCalledWith(9);
      expect(usersService.setTwoFactor).not.toHaveBeenCalled();
    });

    it('rejects once attempts are exhausted', async () => {
      usersService.findById.mockResolvedValue(user());
      repo.findActive.mockResolvedValue({
        id: 9,
        userId: 1,
        codeHash: 'code-hash',
        purpose: 'enable',
        expiresAt: new Date(Date.now() + 60000),
        consumedAt: null,
        attempts: 5,
        createdAt: new Date(),
      });
      await expect(service.enableEmail(1, '123456')).rejects.toThrow(UnauthorizedException);
      expect(bcryptjs.compare).not.toHaveBeenCalled();
    });
  });

  describe('issueLoginChallenge', () => {
    it('signs a challenge and emails a code for the email method', async () => {
      const result = await service.issueLoginChallenge(user({ twoFactorMethod: 'email' }));
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 1, typ: '2fa', mth: 'email' }),
        expect.any(Object),
      );
      expect(emailService.sendOtp).toHaveBeenCalled();
      expect(result).toEqual({ requiresTwoFactor: true, method: 'email', challengeToken: 'signed-token' });
    });

    it('does not email a code for the totp method', async () => {
      const result = await service.issueLoginChallenge(user({ twoFactorMethod: 'totp', totpSecret: 'S' }));
      expect(emailService.sendOtp).not.toHaveBeenCalled();
      expect(result.method).toBe('totp');
    });
  });

  describe('completeLogin', () => {
    it('issues a session token after a valid totp challenge', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, typ: '2fa', mth: 'totp' });
      usersService.findById.mockResolvedValue(user({ twoFactorMethod: 'totp', totpSecret: 'SECRET' }));
      (authenticator.check as jest.Mock).mockReturnValue(true);

      const result = await service.completeLogin('challenge', '123456');

      expect(result.token).toBe('signed-token');
      expect(result.user).toEqual({ id: 1, email: 'test@example.com', firstName: 'John', lastName: 'Doe' });
    });

    it('rejects a tampered/expired challenge', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('bad token');
      });
      await expect(service.completeLogin('bad', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a non-2fa token type', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, email: 'x' });
      await expect(service.completeLogin('session-token', '123456')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('disable', () => {
    it('disables totp with a valid code and clears the secret', async () => {
      usersService.findById.mockResolvedValue(user({ twoFactorMethod: 'totp', totpSecret: 'SECRET' }));
      (authenticator.check as jest.Mock).mockReturnValue(true);

      const result = await service.disable(1, '123456');

      expect(usersService.setTwoFactor).toHaveBeenCalledWith(1, { method: 'none', totpSecret: null });
      expect(result).toEqual({ method: 'none' });
    });

    it('rejects when 2FA is not enabled', async () => {
      usersService.findById.mockResolvedValue(user());
      await expect(service.disable(1, '123456')).rejects.toThrow(BadRequestException);
    });
  });
});
