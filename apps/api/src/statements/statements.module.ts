import { Module } from '@nestjs/common';
import { StatementsService } from './statements.service';
import { StatementsController } from './statements.controller';
import { StatementsRepository } from './statements.repository';
import { AccountsModule } from '../accounts/accounts.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [AccountsModule, LedgerModule],
  providers: [StatementsService, StatementsRepository],
  controllers: [StatementsController],
})
export class StatementsModule {}
