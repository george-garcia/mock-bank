import { Module } from '@nestjs/common';
import { LithicModule } from './lithic.module';
import { LithicWebhookController } from './lithic.webhook.controller';

/** Exposes the inbound Lithic webhook endpoint. The handler + guard live in LithicModule. */
@Module({
  imports: [LithicModule],
  controllers: [LithicWebhookController],
})
export class LithicWebhookModule {}
