import { Module } from '@nestjs/common';
import { ConnectService } from './connect.service';
import { ConnectController } from './connect.controller';
import { ConnectRepository } from './connect.repository';
import { ConnectAccessTokenGuard } from './connect-access-token.guard';
import { AccountsModule } from '../accounts/accounts.module';
import { LithicModule } from '../lithic/lithic.module';
import { AuditModule } from '../audit/audit.module';
import { PartnersModule } from '../partners/partners.module';

@Module({
  // JwtAuthGuard (on the consent route) relies on the passport 'jwt' strategy registered
  // globally by AuthModule — the same way the cards/accounts controllers use it.
  imports: [AccountsModule, LithicModule, AuditModule, PartnersModule],
  providers: [ConnectService, ConnectRepository, ConnectAccessTokenGuard],
  controllers: [ConnectController],
})
export class ConnectModule {}
