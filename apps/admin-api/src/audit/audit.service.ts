import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from './audit.repository';

export interface AuditEvent {
  actorType?: 'customer' | 'staff' | 'system'; // who acted (default 'staff' in the admin app)
  actorUserId?: number | null;
  action: string; // e.g. 'staff.login', 'admin.customer_updated', 'admin.account_frozen'
  targetType?: string;
  targetId?: string | number;
  amountMinor?: number;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes the shared, append-only audit trail (same table the bank API writes to). Auditing
 * must never break the operation it records, so failures are logged, not thrown.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private repo: AuditRepository) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.repo.create({
        actorType: event.actorType ?? 'staff',
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId !== undefined ? String(event.targetId) : undefined,
        amountMinor: event.amountMinor,
        ip: event.ip,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log "${event.action}"`, err as Error);
    }
  }

  listRecent(limit = 50, offset = 0) {
    return this.repo.findRecent(limit, offset);
  }
}
