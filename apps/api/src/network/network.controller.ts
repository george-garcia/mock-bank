import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { PartnerApiKeyGuard, AuthenticatedPartner } from '../partners/partner-api-key.guard';
import { CurrentPartner } from '../partners/current-partner.decorator';
import { NetworkService } from './network.service';
import { CreateAuthorizationDto, CaptureAuthorizationDto, CreateRefundDto } from './dto/network.dto';

/**
 * Public card-acceptance API for merchants (e.g. the gambling site). Authenticated with a
 * partner API key — NOT a customer session. A merchant authorizes a charge against a card by
 * PAN, then captures (settles) or voids it.
 */
@ApiTags('Network (Card Acceptance)')
@ApiSecurity('partner-api-key')
@UseGuards(PartnerApiKeyGuard)
@Controller('network')
export class NetworkController {
  constructor(private networkService: NetworkService) {}

  @Post('authorizations')
  @ApiOperation({ summary: 'Authorize a charge against a bank-issued card (places a hold)' })
  async authorize(@CurrentPartner() partner: AuthenticatedPartner, @Body() dto: CreateAuthorizationDto) {
    return this.networkService.authorize(partner, dto);
  }

  @Post('authorizations/:token/capture')
  @ApiOperation({ summary: 'Capture (settle) a prior authorization' })
  async capture(
    @CurrentPartner() partner: AuthenticatedPartner,
    @Param('token') token: string,
    @Body() dto: CaptureAuthorizationDto,
  ) {
    return this.networkService.capture(partner, token, dto);
  }

  @Post('authorizations/:token/void')
  @ApiOperation({ summary: 'Void a prior authorization (releases the hold)' })
  async void(@CurrentPartner() partner: AuthenticatedPartner, @Param('token') token: string) {
    return this.networkService.void(partner, token);
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Refund a captured charge back to the cardholder' })
  async refund(@CurrentPartner() partner: AuthenticatedPartner, @Body() dto: CreateRefundDto) {
    return this.networkService.refund(partner, dto);
  }
}
