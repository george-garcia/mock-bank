import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuthGuard } from '../staff/staff-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles('admin', 'auditor')
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Read the shared audit trail' })
  list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.auditService.listRecent(limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  }
}
