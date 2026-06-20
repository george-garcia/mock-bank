import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LithicWebhookService } from './lithic-webhook.service';
import { LithicWebhookGuard } from './lithic-webhook.guard';
import { LithicWebhookEvent } from './lithic.types';

@ApiTags('Webhooks')
@Controller('webhooks/lithic')
export class LithicWebhookController {
  constructor(private lithicWebhookService: LithicWebhookService) {}

  @Post()
  @UseGuards(LithicWebhookGuard)
  @ApiOperation({ summary: 'Receive Lithic webhook events (Svix-signature verified)' })
  async handleWebhook(@Body() body: LithicWebhookEvent) {
    return this.lithicWebhookService.processEvent(body);
  }
}
