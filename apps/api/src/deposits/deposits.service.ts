import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';

interface DepositOptions {
  accountId: number;
  amount: string;
  source?: string;
  description?: string;
  instant?: boolean;
}

@Injectable()
export class DepositsService {
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
  ) {}

  async simulateDeposit(userId: number, options: DepositOptions) {
    const { accountId, amount, source = 'simulated', description, instant = false } = options;

    // Verify account ownership
    await this.accountsService.findOne(accountId, userId);

    // For instant deposits (dev/admin), credit immediately
    if (instant) {
      const transaction = await this.transactionsService.recordTransaction(userId, {
        accountId,
        type: 'deposit',
        amount,
        description: description || `Instant deposit from ${source}`,
      });

      return {
        transaction,
        status: 'completed',
        message: 'Deposit credited instantly',
      };
    }

    // Simulate ACH deposit with pending → completed flow
    const transaction = await this.transactionsService.createPendingTransaction(userId, {
      accountId,
      type: 'deposit',
      amount,
      description: description || `ACH deposit from ${source}`,
      metadata: JSON.stringify({
        source,
        simulated: true,
        clearingMethod: 'ACH',
        estimatedClearing: '1-2 business days',
      }),
    });

    // Simulate async completion (in production this would be a cron job or webhook)
    setTimeout(async () => {
      try {
        await this.transactionsService.completeTransaction(transaction.id, userId);
      } catch (err) {
        // Silent fail for simulation - in production use a proper job queue
      }
    }, 5000); // 5 second simulated delay

    return {
      transaction,
      status: 'pending',
      message: 'Deposit initiated, will clear in 1-2 business days (simulated: 5 seconds)',
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
