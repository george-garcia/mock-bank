import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CardsModule } from './cards/cards.module';
import { LithicModule } from './lithic/lithic.module';
import { LithicWebhookController } from './lithic/lithic.webhook.controller';
import { DepositsModule } from './deposits/deposits.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    CardsModule,
    LithicModule,
    DepositsModule,
    WithdrawalsModule,
    TransfersModule,
  ],
  controllers: [LithicWebhookController],
})
export class AppModule {}
