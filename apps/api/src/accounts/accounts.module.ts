import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { AccountsRepository } from './accounts.repository';

@Module({
  providers: [AccountsService, AccountsRepository],
  controllers: [AccountsController],
  exports: [AccountsService],
})
export class AccountsModule {}
