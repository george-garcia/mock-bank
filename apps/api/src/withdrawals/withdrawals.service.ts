import { Injectable, BadRequestException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class WithdrawalsService {
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
  ) {}

  async withdraw(userId: number, accountId: number, amount: string, description?: string) {
    // Verify account ownership
    const account = await this.accountsService.findOne(accountId, userId);

    // Check sufficient funds
    const balance = parseFloat(account.balance);
    const withdrawAmount = parseFloat(amount);
    if (balance < withdrawAmount) {
      throw new BadRequestException('Insufficient funds for withdrawal');
    }

    // Create withdrawal transaction
    const transaction = await this.transactionsService.recordTransaction(userId, {
      accountId,
      type: 'withdrawal',
      amount,
      description: description || 'Withdrawal',
      metadata: JSON.stringify({
        method: 'ACH',
        simulated: true,
        estimatedArrival: '1-3 business days',
      }),
    });

    return {
      transaction,
      status: 'completed',
      message: `Withdrawal of $${amount} processed. Funds will arrive in 1-3 business days.`,
    };
  }

  async simulateACHWithdrawal(userId: number, accountId: number, amount: string, routingNumber?: string, accountNumber?: string) {
    return this.withdraw(userId, accountId, amount, 'ACH withdrawal to external account');
  }
}
