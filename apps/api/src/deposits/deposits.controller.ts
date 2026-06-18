import { Controller, Post, Body, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DepositsService } from './deposits.service';
import { CreateDepositDto } from './dto/create-deposit.dto';

@ApiTags('Deposits')
@ApiBearerAuth()
@ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Dedupe key for safe retries' })
@UseGuards(JwtAuthGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private depositsService: DepositsService) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate a deposit (ACH with clearing delay)' })
  async simulateDeposit(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateDepositDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.depositsService.simulateDeposit(userId, {
      accountId: dto.accountId,
      amount: dto.amount,
      description: dto.description,
      instant: dto.instant,
      idempotencyKey,
    });
  }

  @Post('direct')
  @ApiOperation({ summary: 'Simulate direct deposit/payroll' })
  async directDeposit(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositsService.simulateDirectDeposit(userId, {
      accountId: dto.accountId,
      amount: dto.amount,
      description: dto.description,
      instant: dto.instant,
    });
  }

  @Post('payroll')
  @ApiOperation({ summary: 'Simulate payroll deposit' })
  async payrollDeposit(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateDepositDto,
  ) {
    return this.depositsService.simulatePayrollDeposit(userId, dto.accountId, dto.amount);
  }
}
