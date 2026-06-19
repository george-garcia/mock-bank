import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { StaffRepository } from './staff.repository';
import { StaffSessionsRepository } from './staff-sessions.repository';
import { StaffSessionService } from './staff-session.service';
import { StaffAuthService } from './staff-auth.service';
import { StaffJwtStrategy } from './staff-jwt.strategy';
import { StaffAuthController } from './staff-auth.controller';
import { StaffController } from './staff.controller';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('ADMIN_JWT_SECRET') || configService.get<string>('JWT_SECRET', 'admin-secret-key'),
      }),
    }),
  ],
  providers: [
    StaffRepository,
    StaffSessionsRepository,
    StaffSessionService,
    StaffAuthService,
    StaffJwtStrategy,
    RolesGuard,
  ],
  controllers: [StaffAuthController, StaffController],
})
export class StaffModule {}
