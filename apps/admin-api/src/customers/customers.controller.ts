import { Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuthGuard } from '../staff/staff-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles('admin', 'auditor')
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List bank customers' })
  list() {
    return this.customersService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Customer profile + accounts' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getDetail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit customer profile data' })
  update(@CurrentUser('sub') staffId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(staffId, id, dto);
  }
}
