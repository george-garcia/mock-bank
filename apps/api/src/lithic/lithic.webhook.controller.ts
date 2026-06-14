import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LithicWebhookService, LithicWebhookPayload } from './lithic-webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks/lithic')
export class LithicWebhookController {
  constructor(private lithicWebhookService: LithicWebhookService) {}

  @Post()
  @ApiOperation({ summary: 'Receive Lithic webhook events' })
  async handleWebhook(
    @Body() body: LithicWebhookPayload,
    // In production, verify this signature before processing.
    @Headers('x-lithic-webhook-secret') _signature: string,
  ) {
    return this.lithicWebhookService.processEvent(body);
  }
}
