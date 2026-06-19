import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuthGuard } from './staff-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffAuthService } from './staff-auth.service';
import { CreateStaffDto } from './dto/create-staff.dto';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles('admin') // staff management is admin (engineer) only
@Controller('staff')
export class StaffController {
  constructor(private staffAuthService: StaffAuthService) {}

  @Get()
  @ApiOperation({ summary: 'List staff users' })
  list() {
    return this.staffAuthService.listStaff();
  }

  @Post()
  @ApiOperation({ summary: 'Create a staff user' })
  create(@CurrentUser('sub') adminId: number, @Body() dto: CreateStaffDto) {
    return this.staffAuthService.createStaff(adminId, dto);
  }
}
