import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { toMinor } from '../common/money';

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
  constructor(
    private accountsService: AccountsService,
    private ledgerService: LedgerService,
    private auditService: AuditService,
  ) {}

  async simulateDeposit(userId: number, options: DepositOptions) {
    const { accountId, amount, source = 'simulated', description, idempotencyKey } = options;

    // Ownership check
    await this.accountsService.findOne(accountId, userId);

    // Posts immediately as a single balanced ledger journal. (Durable ACH-style pending →
    // cleared lifecycle via a job queue is a later slice; this credits on receipt.)
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
}
