import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { StaffAuthService } from './staff-auth.service';
import { StaffSessionService } from './staff-session.service';
import { StaffAuthGuard } from './staff-auth.guard';
import { LoginDto } from '../common/dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { setStaffAuthCookies, clearStaffAuthCookies, STAFF_REFRESH_COOKIE } from '../common/cookies';

@ApiTags('Auth')
@Controller('auth')
export class StaffAuthController {
  constructor(
    private staffAuthService: StaffAuthService,
    private staffSessionService: StaffSessionService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff login' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.staffAuthService.login(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
    setStaffAuthCookies(res, result.session);
    return { staff: result.staff };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the staff session' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const issued = await this.staffSessionService.refresh(req.cookies?.[STAFF_REFRESH_COOKIE], {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setStaffAuthCookies(res, issued);
    return { staff: issued.staff };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the staff session' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.staffSessionService.revoke(req.cookies?.[STAFF_REFRESH_COOKIE]);
    clearStaffAuthCookies(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(StaffAuthGuard)
  @ApiOperation({ summary: 'Current staff principal' })
  me(@CurrentUser() user: unknown) {
    return user;
  }
}
