import { Injectable, Logger } from '@nestjs/common';
import { AuditRepository } from './audit.repository';

export interface AuditEvent {
  actorUserId?: number | null; // null = system / webhook
  action: string; // e.g. 'money.deposit', 'auth.login', 'card.refund'
  targetType?: string;
  targetId?: string | number;
  amountMinor?: number;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes the append-only audit trail. Auditing must never break the operation it records,
 * so failures are logged, not thrown.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private repo: AuditRepository) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.repo.create({
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
}
