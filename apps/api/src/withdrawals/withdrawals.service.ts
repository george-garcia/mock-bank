import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class WithdrawalsService {
  constructor(
    private accountsService: AccountsService,
    private ledgerService: LedgerService,
  ) {}

  async withdraw(userId: number, accountId: number, amount: string, description?: string, idempotencyKey?: string) {
    // Ownership check (the ledger enforces sufficient funds atomically).
    await this.accountsService.findOne(accountId, userId);

    const transaction = await this.ledgerService.withdraw(accountId, {
      amount,
      description: description || 'Withdrawal',
      idempotencyKey,
    });

    return {
      transaction: { ...transaction.transaction, amount },
      status: 'completed',
      message: `Withdrawal of $${amount} processed. Funds will arrive in 1-3 business days.`,
    };
  }

  async simulateACHWithdrawal(
    userId: number,
    accountId: number,
    amount: string,
    _routingNumber?: string,
    _accountNumber?: string,
  ) {
    return this.withdraw(userId, accountId, amount, 'ACH withdrawal to external account');
  }
}
