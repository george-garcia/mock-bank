import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { LithicWebhookController } from './lithic.webhook.controller';
import { LithicWebhookService } from './lithic-webhook.service';

@Module({
  imports: [CardsModule, TransactionsModule],
  controllers: [LithicWebhookController],
  providers: [LithicWebhookService],
})
export class LithicWebhookModule {}
