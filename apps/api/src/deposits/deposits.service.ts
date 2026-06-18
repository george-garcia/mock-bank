import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { PendingDepositsRepository } from './pending-deposits.repository';
import { toMinor, toDecimalString } from '../common/money';

interface DepositOptions {
  accountId: number;
  amount: string;
  source?: string;
  description?: string;
  instant?: boolean;
  idempotencyKey?: string;
}

@Injectable()
export class DepositsService {
  private readonly clearSeconds: number;

  constructor(
    private accountsService: AccountsService,
    private ledgerService: LedgerService,
    private auditService: AuditService,
    private pendingRepo: PendingDepositsRepository,
    private configService: ConfigService,
  ) {
    this.clearSeconds = Number(this.configService.get<string>('PENDING_CLEAR_SECONDS', '5'));
  }

  async simulateDeposit(userId: number, options: DepositOptions) {
    const { accountId, amount, source = 'simulated', description, instant = false, idempotencyKey } = options;

    // Ownership check
    await this.accountsService.findOne(accountId, userId);

    // Instant deposits credit immediately.
    if (instant) {
      const transaction = await this.ledgerService.deposit(accountId, {
        amount,
        description: description || `Deposit from ${source}`,
        idempotencyKey,
      });
      await this.auditService.record({
        actorUserId: userId,
        action: 'money.deposit',
        targetType: 'account',
        targetId: accountId,
        amountMinor: toMinor(amount),
        metadata: { source, transactionId: transaction.transaction.id },
      });
      return {
        transaction: { ...transaction.transaction, amount },
        status: 'completed',
        message: `Deposit of $${amount} credited`,
      };
    }

    // ACH-style deposits are queued and cleared later by the scheduled clearing job. The
    // record is durable, so a process restart does not lose the deposit. Funds are not
    // credited until cleared.
    const clearAt = new Date(Date.now() + this.clearSeconds * 1000);
    const pending = await this.pendingRepo.create({
      accountId,
      amountMinor: toMinor(amount),
      description: description || `ACH deposit from ${source}`,
      source,
      clearAt,
      idempotencyKey: idempotencyKey ?? `deposit:${randomUUID()}`,
    });

    await this.auditService.record({
      actorUserId: userId,
      action: 'money.deposit_initiated',
      targetType: 'account',
      targetId: accountId,
      amountMinor: toMinor(amount),
      metadata: { source, pendingId: pending.id, clearAt: clearAt.toISOString() },
    });

    return {
      pendingDepositId: pending.id,
      status: 'pending',
      clearAt: clearAt.toISOString(),
      message: `Deposit of $${amount} initiated; funds will clear shortly (ACH simulation).`,
    };
  }

  async simulateDirectDeposit(userId: number, options: Omit<DepositOptions, 'source'>) {
    return this.simulateDeposit(userId, {
      ...options,
      source: 'direct_deposit',
      description: options.description || 'Direct deposit - Payroll',
    });
  }

  async simulatePayrollDeposit(userId: number, accountId: number, amount: string) {
    return this.simulateDeposit(userId, {
      accountId,
      amount,
      source: 'payroll',
      description: 'Payroll deposit',
    });
  }

  /** The user's not-yet-cleared deposits across all their accounts. */
  async listPending(userId: number) {
    const accounts = await this.accountsService.findAllByUser(userId);
    const rows = await this.pendingRepo.findByAccounts(accounts.map((a) => a.id), 'pending');
    return rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      amount: toDecimalString(r.amountMinor),
      description: r.description,
      status: r.status,
      clearAt: r.clearAt,
      createdAt: r.createdAt,
    }));
  }
}
