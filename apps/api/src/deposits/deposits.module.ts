import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { ClearingService } from './clearing.service';
import { PendingDepositsRepository } from './pending-deposits.repository';
import { AccountsModule } from '../accounts/accounts.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [AccountsModule, LedgerModule],
  providers: [DepositsService, ClearingService, PendingDepositsRepository],
  controllers: [DepositsController],
  exports: [DepositsService],
})
export class DepositsModule {}
