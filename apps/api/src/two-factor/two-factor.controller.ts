import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TwoFactorService } from './two-factor.service';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyLoginDto } from './dto/verify-login.dto';

@ApiTags('Two-Factor Auth')
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  // ---- Login (public) -----------------------------------------------------

  @Post('verify-login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a 2FA login challenge and receive a session token' })
  @ApiResponse({ status: 200, description: 'Login complete' })
  @ApiResponse({ status: 401, description: 'Invalid code or challenge' })
  async verifyLogin(@Body() dto: VerifyLoginDto) {
    return this.twoFactorService.completeLogin(dto.challengeToken, dto.code);
  }

  // ---- Management (authenticated) ----------------------------------------

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current 2FA status for the user' })
  async status(@CurrentUser('sub') userId: number) {
    return this.twoFactorService.getStatus(userId);
  }

  @Post('totp/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin authenticator (TOTP) setup — returns secret + QR code' })
  async totpSetup(@CurrentUser('sub') userId: number) {
    return this.twoFactorService.setupTotp(userId);
  }

  @Post('totp/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an authenticator code to enable TOTP 2FA' })
  async totpEnable(@CurrentUser('sub') userId: number, @Body() dto: VerifyCodeDto) {
    return this.twoFactorService.enableTotp(userId, dto.code);
  }

  @Post('email/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an email verification code to enable (or disable) email 2FA' })
  async emailSetup(@CurrentUser('sub') userId: number) {
    return this.twoFactorService.setupEmail(userId);
  }

  @Post('email/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an emailed code to enable email 2FA' })
  async emailEnable(@CurrentUser('sub') userId: number, @Body() dto: VerifyCodeDto) {
    return this.twoFactorService.enableEmail(userId, dto.code);
  }

  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA (requires a current verification code)' })
  async disable(@CurrentUser('sub') userId: number, @Body() dto: VerifyCodeDto) {
    return this.twoFactorService.disable(userId, dto.code);
  }
}
