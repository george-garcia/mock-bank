import { Global, Module } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { RolesGuard } from '../common/guards/roles.guard';

@Global()
@Module({
  providers: [AuditRepository, AuditService, RolesGuard],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
