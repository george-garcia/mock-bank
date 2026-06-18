import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class TransfersService {
  constructor(
    private accountsService: AccountsService,
    private ledgerService: LedgerService,
  ) {}

  async transfer(
    userId: number,
    fromAccountId: number,
    toAccountId: number,
    amount: string,
    description?: string,
    idempotencyKey?: string,
  ) {
    // Verify both accounts belong to the user (the ledger enforces funds + same-account rules
    // atomically as a single balanced journal).
    await this.accountsService.findOne(fromAccountId, userId);
    await this.accountsService.findOne(toAccountId, userId);

    await this.ledgerService.transfer(fromAccountId, toAccountId, {
      amount,
      description: description || `Transfer to account ${toAccountId}`,
      idempotencyKey,
    });

    return {
      fromTransaction: { accountId: fromAccountId },
      toTransaction: { accountId: toAccountId },
      message: `Successfully transferred $${amount} from account ${fromAccountId} to account ${toAccountId}`,
    };
  }
}
