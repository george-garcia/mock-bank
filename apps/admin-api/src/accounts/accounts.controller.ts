import { Controller, Get, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuthGuard } from '../staff/staff-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { TransactionsService } from '../transactions/transactions.service';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles('admin', 'auditor')
@Controller('accounts')
export class AccountsController {
  constructor(
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all customer accounts (with balances + owner)' })
  list() {
    return this.accountsService.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Account detail' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.accountsService.getById(id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Account transaction history (read-only)' })
  transactions(@Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.historyForAccount(id);
  }

  @Patch(':id/freeze')
  @ApiOperation({ summary: 'Freeze an account (blocks debits)' })
  freeze(@CurrentUser('sub') staffId: number, @Param('id', ParseIntPipe) id: number) {
    return this.accountsService.setStatus(staffId, id, 'frozen', 'admin.account_frozen');
  }

  @Patch(':id/unfreeze')
  @ApiOperation({ summary: 'Unfreeze an account' })
  unfreeze(@CurrentUser('sub') staffId: number, @Param('id', ParseIntPipe) id: number) {
    return this.accountsService.setStatus(staffId, id, 'active', 'admin.account_unfrozen');
  }

  @Patch(':id/close')
  @Roles('admin') // closing is an admin (engineer) action
  @ApiOperation({ summary: 'Close an account (blocks all activity)' })
  close(@CurrentUser('sub') staffId: number, @Param('id', ParseIntPipe) id: number) {
    return this.accountsService.setStatus(staffId, id, 'closed', 'admin.account_closed');
  }
}
