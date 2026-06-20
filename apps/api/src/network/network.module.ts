import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';
import { NetworkController } from './network.controller';
import { LithicModule } from '../lithic/lithic.module';
import { AuditModule } from '../audit/audit.module';
import { PartnersModule } from '../partners/partners.module';

@Module({
  imports: [LithicModule, AuditModule, PartnersModule],
  providers: [NetworkService],
  controllers: [NetworkController],
})
export class NetworkModule {}
