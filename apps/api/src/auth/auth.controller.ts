import { Controller, Post, Body, HttpCode, HttpStatus, Get, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from '../session/session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from '../common/cookies';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto, this.ctx(req));
    setAuthCookies(res, result.session);
    return { user: result.user };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, this.ctx(req));
    if ('requiresTwoFactor' in result) {
      return result; // 2FA challenge — no session/cookies until verified
    }
    setAuthCookies(res, result.session);
    return { user: result.user };
  }

  @Post('demo-login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Passwordless one-click sign-in as the demo customer' })
  async demoLogin(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.demoLogin(this.ctx(req));
    setAuthCookies(res, result.session);
    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the session using the refresh cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const issued = await this.sessionService.refresh(req.cookies?.[REFRESH_COOKIE], this.ctx(req));
    setAuthCookies(res, issued);
    return { user: issued.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current session and clear cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.sessionService.revoke(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    return { success: true };
  }

  private ctx(req: Request) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }
}
