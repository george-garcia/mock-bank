import { Module } from '@nestjs/common';
import { AccountsRepository } from './accounts.repository';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { TransactionsService } from '../transactions/transactions.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  providers: [AccountsRepository, AccountsService, TransactionsRepository, TransactionsService, RolesGuard],
  controllers: [AccountsController],
  exports: [AccountsService],
})
export class AccountsModule {}
