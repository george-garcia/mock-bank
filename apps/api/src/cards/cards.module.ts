import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { CardsRepository } from './cards.repository';
import { LithicModule } from '../lithic/lithic.module';
import { AccountsModule } from '../accounts/accounts.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [LithicModule, AccountsModule, AuditModule],
  providers: [CardsService, CardsRepository],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}
