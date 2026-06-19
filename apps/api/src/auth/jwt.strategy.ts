import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@mock-bank/types';
import { UsersService } from '../users/users.service';
import { ACCESS_COOKIE } from '../common/cookies';

// Primary source is the httpOnly access-token cookie; Bearer header is kept as a fallback
// for API tooling / tests.
const cookieExtractor = (req: any): string | null => req?.cookies?.[ACCESS_COOKIE] ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'mockbank-secret-key'),
    });
  }

  async validate(payload: JwtPayload & { typ?: string }): Promise<JwtPayload> {
    // Reject intermediate 2FA challenge tokens — they must not grant session access.
    if (payload.typ) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { sub: user.id, email: user.email };
  }
}
