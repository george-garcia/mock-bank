import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { StaffJwtPayload } from '@mock-bank/types';
import { StaffRepository } from './staff.repository';
import { STAFF_ACCESS_COOKIE } from '../common/cookies';

const staffCookieExtractor = (req: any): string | null => req?.cookies?.[STAFF_ACCESS_COOKIE] ?? null;

@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
  constructor(
    private configService: ConfigService,
    private staffRepo: StaffRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([staffCookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_SECRET') || configService.get<string>('JWT_SECRET', 'admin-secret-key'),
    });
  }

  async validate(payload: StaffJwtPayload) {
    if (payload.typ !== 'staff') {
      throw new UnauthorizedException('Invalid token');
    }
    const staff = await this.staffRepo.findById(payload.sub);
    if (!staff) {
      throw new UnauthorizedException('Staff user not found');
    }
    return { sub: staff.id, email: staff.email, role: staff.role };
  }
}
