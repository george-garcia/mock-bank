import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { SessionService } from './session.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mockbank-secret-key'),
      }),
    }),
  ],
  providers: [SessionService, SessionsRepository],
  exports: [SessionService],
})
export class SessionModule {}
