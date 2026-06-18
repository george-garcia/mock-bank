import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LithicWebhookController } from './lithic.webhook.controller';
import { LithicWebhookService } from './lithic-webhook.service';
import { LithicWebhookGuard } from './lithic-webhook.guard';

@Module({
  imports: [CardsModule, LedgerModule],
  controllers: [LithicWebhookController],
  providers: [LithicWebhookService, LithicWebhookGuard],
})
export class LithicWebhookModule {}
