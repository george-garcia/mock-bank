import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LithicWebhookService, LithicWebhookPayload } from './lithic-webhook.service';
import { LithicWebhookGuard } from './lithic-webhook.guard';

@ApiTags('Webhooks')
@Controller('webhooks/lithic')
export class LithicWebhookController {
  constructor(private lithicWebhookService: LithicWebhookService) {}

  @Post()
  @UseGuards(LithicWebhookGuard)
  @ApiOperation({ summary: 'Receive Lithic webhook events (HMAC-signature verified)' })
  async handleWebhook(@Body() body: LithicWebhookPayload) {
    return this.lithicWebhookService.processEvent(body);
  }
}
