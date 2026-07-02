import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PartnerApiKeyGuard, AuthenticatedPartner } from '../partners/partner-api-key.guard';
import { CurrentPartner } from '../partners/current-partner.decorator';
import { ConnectAccessTokenGuard, CurrentGrant } from './connect-access-token.guard';
import { ConnectGrant } from '@mock-bank/database';
import { ConnectService } from './connect.service';
import { CreateLinkSessionDto, ExchangeTokenDto, AuthorizeSessionDto, CreateConnectTransferDto } from './dto/connect.dto';

/**
 * Connect (account linking). Each route is authenticated by exactly one identity:
 *   • partner API key   → create link session, exchange public token
 *   • public            → load hosted-page session info (token is unguessable)
 *   • bank customer JWT → authorize/consent on the hosted page
 *   • Connect grant     → read balances, move money
 */
@ApiTags('Connect')
@Controller('connect')
export class ConnectController {
  constructor(private connectService: ConnectService) {}

  // ── partner (API key) ──
  @Post('link-sessions')
  @ApiSecurity('partner-api-key')
  @UseGuards(PartnerApiKeyGuard)
  @ApiOperation({ summary: 'Create a Connect link session (partner)' })
  async createLinkSession(@CurrentPartner() partner: AuthenticatedPartner, @Body() dto: CreateLinkSessionDto) {
    return this.connectService.createLinkSession(partner, dto.scopes);
  }

  @Post('token')
  @ApiSecurity('partner-api-key')
  @UseGuards(PartnerApiKeyGuard)
  @ApiOperation({ summary: 'Exchange a public token for an access token (partner)' })
  async exchange(@CurrentPartner() partner: AuthenticatedPartner, @Body() dto: ExchangeTokenDto) {
    return this.connectService.exchangeToken(partner, dto.public_token);
  }

  // ── public (hosted UI bootstrap) ──
  @Get('link-sessions/:linkToken')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // unauthenticated — limit token probing
  @ApiOperation({ summary: 'Load non-secret session info for the hosted consent page' })
  async getSession(@Param('linkToken') linkToken: string) {
    return this.connectService.getPublicSession(linkToken);
  }

  // ── bank customer (cookie/JWT) — the consent action on the hosted page ──
  @Post('link-sessions/:linkToken/authorize')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Authorize a link session for the logged-in customer' })
  async authorize(
    @CurrentUser('sub') userId: number,
    @Param('linkToken') linkToken: string,
    @Body() dto: AuthorizeSessionDto,
  ) {
    return this.connectService.authorizeSession(linkToken, userId, dto.accountId);
  }

  // ── Connect grant (access token) ──
  @Get('accounts')
  @ApiBearerAuth()
  @UseGuards(ConnectAccessTokenGuard)
  @ApiOperation({ summary: 'List linked account balances (grant)' })
  async accounts(@CurrentGrant() grant: ConnectGrant) {
    return this.connectService.getAccounts(grant);
  }

  @Post('transfers')
  @ApiBearerAuth()
  @UseGuards(ConnectAccessTokenGuard)
  @ApiOperation({ summary: 'Move money on a linked account: debit (pull) or credit (cash-out)' })
  async transfer(@CurrentGrant() grant: ConnectGrant, @Body() dto: CreateConnectTransferDto) {
    return this.connectService.createTransfer(grant, dto);
  }
}
