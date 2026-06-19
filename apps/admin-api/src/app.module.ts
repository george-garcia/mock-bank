import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from './audit/audit.module';
import { StaffModule } from './staff/staff.module';
import { CustomersModule } from './customers/customers.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // env already loaded by ./env
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuditModule,
    StaffModule,
    CustomersModule,
    AccountsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
