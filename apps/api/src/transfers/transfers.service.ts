import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class TransfersService {
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
  ) {}

  async transfer(userId: number, fromAccountId: number, toAccountId: number, amount: string, description?: string) {
    // Verify both accounts belong to user
    const fromAccount = await this.accountsService.findOne(fromAccountId, userId);
    const toAccount = await this.accountsService.findOne(toAccountId, userId);

    // Check sufficient funds
    const balance = parseFloat(fromAccount.balance);
    const transferAmount = parseFloat(amount);
    if (balance < transferAmount) {
      throw new BadRequestException('Insufficient funds for transfer');
    }

    // Check not transferring to same account
    if (fromAccountId === toAccountId) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    // Create withdrawal from source account
    const withdrawalTx = await this.transactionsService.recordTransaction(userId, {
      accountId: fromAccountId,
      type: 'transfer',
      amount,
      description: description || `Transfer to account ${toAccountId}`,
      metadata: JSON.stringify({
        transferType: 'outgoing',
        toAccountId,
        fromAccountId,
      }),
    });

    // Create deposit to destination account
    const depositTx = await this.transactionsService.recordTransaction(userId, {
      accountId: toAccountId,
      type: 'transfer',
      amount,
      description: description || `Transfer from account ${fromAccountId}`,
      metadata: JSON.stringify({
        transferType: 'incoming',
        fromAccountId,
        toAccountId,
      }),
    });

    return {
      fromTransaction: withdrawalTx,
      toTransaction: depositTx,
      message: `Successfully transferred $${amount} from account ${fromAccountId} to account ${toAccountId}`,
    };
  }
}
