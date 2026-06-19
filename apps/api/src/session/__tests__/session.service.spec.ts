import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../session.service';
import { SessionsRepository } from '../sessions.repository';
import { UsersService } from '../../users/users.service';

describe('SessionService', () => {
  let service: SessionService;
  let repo: jest.Mocked<Pick<SessionsRepository, 'create' | 'findByHash' | 'revoke' | 'revokeAllForUser'>>;
  let users: jest.Mocked<Pick<UsersService, 'findById'>>;

  const user = { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B' } as any;

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockResolvedValue({ id: 10 }),
      findByHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    users = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: SessionsRepository, useValue: repo },
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('access-jwt') } },
        { provide: ConfigService, useValue: { get: (_k: string, d?: string) => d } },
      ],
    }).compile();

    service = module.get(SessionService);
  });

  describe('issueForUser', () => {
    it('persists a session and returns an access token + opaque refresh token', async () => {
      const issued = await service.issueForUser(user, { ip: '1.2.3.4', userAgent: 'jest' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, refreshTokenHash: expect.any(String), expiresAt: expect.any(Date) }),
      );
      expect(issued.accessToken).toBe('access-jwt');
      expect(issued.refreshToken).toMatch(/^[a-f0-9]{64}$/); // 32 random bytes hex
      expect(issued.user).toEqual({ id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B' });
    });
  });

  describe('refresh', () => {
    it('rejects when no token is provided', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown refresh token', async () => {
      repo.findByHash.mockResolvedValue(null);
      await expect(service.refresh('abc')).rejects.toThrow(UnauthorizedException);
    });

    it('detects reuse of a revoked token and revokes all sessions', async () => {
      repo.findByHash.mockResolvedValue({ id: 5, userId: 1, revokedAt: new Date(), expiresAt: new Date(Date.now() + 1000) } as any);
      await expect(service.refresh('abc')).rejects.toThrow(UnauthorizedException);
      expect(repo.revokeAllForUser).toHaveBeenCalledWith(1);
    });

    it('rejects an expired session', async () => {
      repo.findByHash.mockResolvedValue({ id: 5, userId: 1, revokedAt: null, expiresAt: new Date(Date.now() - 1000) } as any);
      await expect(service.refresh('abc')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates a valid session: issues a new one and revokes the old', async () => {
      repo.findByHash.mockResolvedValue({ id: 5, userId: 1, revokedAt: null, expiresAt: new Date(Date.now() + 100000) } as any);
      users.findById.mockResolvedValue(user);
      repo.create.mockResolvedValue({ id: 6 } as any);

      const issued = await service.refresh('abc');

      expect(issued.accessToken).toBe('access-jwt');
      expect(repo.revoke).toHaveBeenCalledWith(5, 6); // old revoked, linked to the new session
    });
  });

  describe('revoke', () => {
    it('revokes the session for a refresh token', async () => {
      repo.findByHash.mockResolvedValue({ id: 9, userId: 1, revokedAt: null } as any);
      await service.revoke('abc');
      expect(repo.revoke).toHaveBeenCalledWith(9);
    });

    it('is a no-op for a missing token', async () => {
      await service.revoke(undefined);
      expect(repo.revoke).not.toHaveBeenCalled();
    });
  });
});
