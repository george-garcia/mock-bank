import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { StaffRole } from '@mock-bank/types';
import { AuditService } from '../audit/audit.service';
import { StaffRepository } from './staff.repository';
import { StaffSessionService } from './staff-session.service';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class StaffAuthService {
  constructor(
    private staffRepo: StaffRepository,
    private staffSessionService: StaffSessionService,
    private auditService: AuditService,
  ) {}

  async login(dto: { email: string; password: string }, ctx: RequestContext = {}) {
    const staff = await this.staffRepo.findByEmail(dto.email);
    if (!staff) {
      await this.auditService.record({ actorType: 'system', action: 'staff.login_failed', metadata: { email: dto.email, reason: 'unknown_user' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (staff.lockedUntil && staff.lockedUntil.getTime() > Date.now()) {
      await this.auditService.record({ actorType: 'staff', actorUserId: staff.id, action: 'staff.login_blocked' });
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const isValid = await bcryptjs.compare(dto.password, staff.passwordHash);
    if (!isValid) {
      const attempts = staff.failedLoginAttempts + 1;
      const locked = attempts >= MAX_FAILED_LOGINS;
      await this.staffRepo.update(staff.id, {
        failedLoginAttempts: attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      });
      await this.auditService.record({
        actorType: 'staff',
        actorUserId: staff.id,
        action: locked ? 'staff.account_locked' : 'staff.login_failed',
        metadata: { attempts },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (staff.failedLoginAttempts > 0 || staff.lockedUntil) {
      await this.staffRepo.update(staff.id, { failedLoginAttempts: 0, lockedUntil: null });
    }

    await this.auditService.record({ actorType: 'staff', actorUserId: staff.id, action: 'staff.login', ip: ctx.ip });
    const session = await this.staffSessionService.issueForStaff(staff, ctx);
    return { staff: session.staff, session };
  }

  /** Create a staff user (admin only). Staff identities are managed entirely in the admin app. */
  async createStaff(creatorId: number, dto: { email: string; password: string; firstName: string; lastName: string; role: StaffRole }) {
    if (await this.staffRepo.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcryptjs.hash(dto.password, 10);
    const staff = await this.staffRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
    });
    await this.auditService.record({
      actorType: 'staff',
      actorUserId: creatorId,
      action: 'staff.created',
      targetType: 'staff_user',
      targetId: staff.id,
      metadata: { role: dto.role },
    });
    return this.publicView(staff);
  }

  async listStaff() {
    const rows = await this.staffRepo.findAll();
    return rows.map((s) => this.publicView(s));
  }

  private publicView(s: { id: number; email: string; firstName: string; lastName: string; role: string }) {
    return { id: s.id, email: s.email, firstName: s.firstName, lastName: s.lastName, role: s.role };
  }
}
