import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { CardsModule } from '../cards/cards.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../audit/audit.module';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [CardsModule, LedgerModule, AuditModule, PartnersModule],
  providers: [NetworkService],
  controllers: [NetworkController],
})
export class NetworkModule {}
