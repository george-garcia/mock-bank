import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { UsersModule } from './users/users.module';
import { LedgerModule } from './ledger/ledger.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StatementsModule } from './statements/statements.module';
import { CardsModule } from './cards/cards.module';
import { LithicModule } from './lithic/lithic.module';
import { LithicWebhookModule } from './lithic/lithic-webhook.module';
import { DepositsModule } from './deposits/deposits.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { TransfersModule } from './transfers/transfers.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    AuditModule,
    EmailModule,
    AuthModule,
    TwoFactorModule,
    UsersModule,
    LedgerModule,
    AccountsModule,
    TransactionsModule,
    StatementsModule,
    CardsModule,
    LithicModule,
    LithicWebhookModule,
    DepositsModule,
    WithdrawalsModule,
    TransfersModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
