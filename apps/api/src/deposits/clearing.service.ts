import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { PendingDepositsRepository } from './pending-deposits.repository';
import { toDecimalString } from '../common/money';

/**
 * Durable, restart-safe clearing: a scheduled job posts due pending deposits to the ledger and
 * releases expired holds. State lives in the database, so nothing is lost on a process restart.
 * Posting is idempotent (each pending deposit carries an idempotency key), so an overlapping or
 * repeated run can never double-credit.
 */
@Injectable()
export class ClearingService {
  private readonly logger = new Logger(ClearingService.name);
  private running = false;

  constructor(
    private pendingRepo: PendingDepositsRepository,
    private ledgerService: LedgerService,
    private auditService: AuditService,
  ) {}

  @Interval(10000)
  async runClearingCycle() {
    if (this.running) return; // never overlap cycles
    this.running = true;
    try {
      await this.clearDueDeposits();
      const expired = await this.ledgerService.expireHolds();
      if (expired > 0) this.logger.log(`Expired ${expired} hold(s)`);
    } catch (err) {
      this.logger.error('Clearing cycle failed', err as Error);
    } finally {
      this.running = false;
    }
  }

  /** Post all due pending deposits to the ledger. Returns the number cleared. */
  async clearDueDeposits(now = new Date()): Promise<number> {
    const due = await this.pendingRepo.findDue(now);
    let cleared = 0;
    for (const d of due) {
      try {
        const result = await this.ledgerService.deposit(d.accountId, {
          amount: toDecimalString(d.amountMinor),
          description: d.description ?? 'ACH deposit',
          idempotencyKey: d.idempotencyKey,
        });
        await this.pendingRepo.markCleared(d.id, result.transaction.id);
        await this.auditService.record({
          action: 'money.deposit_cleared',
          targetType: 'account',
          targetId: d.accountId,
          amountMinor: d.amountMinor,
          metadata: { pendingId: d.id, transactionId: result.transaction.id },
        });
        cleared++;
      } catch (err) {
        this.logger.error(`Failed to clear pending deposit ${d.id}; will retry next cycle`, err as Error);
      }
    }
    if (cleared > 0) this.logger.log(`Cleared ${cleared} pending deposit(s)`);
    return cleared;
  }
}
