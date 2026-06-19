import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { StaffAuthService } from '../staff-auth.service';
import { StaffRepository } from '../staff.repository';
import { StaffSessionService } from '../staff-session.service';
import { AuditService } from '../../audit/audit.service';

jest.mock('bcryptjs');

const mockStaff = {
  id: 7,
  email: 'admin@bank.internal',
  passwordHash: 'hashed',
  firstName: 'Avery',
  lastName: 'Admin',
  role: 'admin' as const,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('StaffAuthService', () => {
  let service: StaffAuthService;
  let staffRepo: jest.Mocked<StaffRepository>;
  let staffSessionService: jest.Mocked<StaffSessionService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffAuthService,
        { provide: StaffRepository, useValue: { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), findAll: jest.fn() } },
        { provide: StaffSessionService, useValue: { issueForStaff: jest.fn() } },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get(StaffAuthService);
    staffRepo = module.get(StaffRepository);
    staffSessionService = module.get(StaffSessionService);
    auditService = module.get(AuditService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('rejects an unknown staff email and records a system audit event', async () => {
      staffRepo.findByEmail.mockResolvedValue(null);
      await expect(service.login({ email: 'nobody@bank.internal', password: 'x' })).rejects.toThrow(UnauthorizedException);
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ actorType: 'system', action: 'staff.login_failed' }));
      expect(staffSessionService.issueForStaff).not.toHaveBeenCalled();
    });

    it('rejects while the account is locked', async () => {
      staffRepo.findByEmail.mockResolvedValue({ ...mockStaff, lockedUntil: new Date(Date.now() + 60_000) });
      await expect(service.login({ email: mockStaff.email, password: 'x' })).rejects.toThrow(UnauthorizedException);
      expect(staffSessionService.issueForStaff).not.toHaveBeenCalled();
    });

    it('increments failed attempts on a bad password', async () => {
      staffRepo.findByEmail.mockResolvedValue({ ...mockStaff });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ email: mockStaff.email, password: 'wrong' })).rejects.toThrow(UnauthorizedException);
      expect(staffRepo.update).toHaveBeenCalledWith(mockStaff.id, expect.objectContaining({ failedLoginAttempts: 1 }));
    });

    it('locks the account after the 5th failed attempt', async () => {
      staffRepo.findByEmail.mockResolvedValue({ ...mockStaff, failedLoginAttempts: 4 });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ email: mockStaff.email, password: 'wrong' })).rejects.toThrow(UnauthorizedException);
      expect(staffRepo.update).toHaveBeenCalledWith(mockStaff.id, expect.objectContaining({ failedLoginAttempts: 5, lockedUntil: expect.any(Date) }));
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'staff.account_locked' }));
    });

    it('issues a staff session on valid credentials', async () => {
      staffRepo.findByEmail.mockResolvedValue({ ...mockStaff });
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      const issued = {
        staff: { id: 7, email: mockStaff.email, firstName: 'Avery', lastName: 'Admin', role: 'admin' },
        accessToken: 'a', refreshToken: 'r', accessMaxAgeMs: 1, refreshMaxAgeMs: 2,
      };
      staffSessionService.issueForStaff.mockResolvedValue(issued);

      const result = await service.login({ email: mockStaff.email, password: 'password123' });
      expect(staffSessionService.issueForStaff).toHaveBeenCalled();
      expect(result.staff).toEqual(issued.staff);
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ actorType: 'staff', action: 'staff.login' }));
    });
  });

  describe('createStaff', () => {
    it('rejects a duplicate email', async () => {
      staffRepo.findByEmail.mockResolvedValue({ ...mockStaff });
      await expect(
        service.createStaff(1, { email: mockStaff.email, password: 'password123', firstName: 'A', lastName: 'B', role: 'auditor' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password, creates the staff user, and audits it', async () => {
      staffRepo.findByEmail.mockResolvedValue(null);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-pw');
      staffRepo.create.mockResolvedValue({ ...mockStaff, id: 12, email: 'new@bank.internal', role: 'auditor' });

      const result = await service.createStaff(1, { email: 'new@bank.internal', password: 'password123', firstName: 'Sam', lastName: 'Support', role: 'auditor' });

      expect(staffRepo.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@bank.internal', passwordHash: 'hashed-pw', role: 'auditor' }));
      expect(result).toEqual({ id: 12, email: 'new@bank.internal', firstName: 'Avery', lastName: 'Admin', role: 'auditor' });
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ actorType: 'staff', action: 'staff.created', actorUserId: 1 }));
    });
  });
});
