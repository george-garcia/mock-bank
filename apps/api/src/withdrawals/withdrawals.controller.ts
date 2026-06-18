import { Controller, Post, Body, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Dedupe key for safe retries' })
@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private withdrawalsService: WithdrawalsService) {}

  @Post()
  @ApiOperation({ summary: 'Withdraw funds from account' })
  async withdraw(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateWithdrawalDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.withdrawalsService.withdraw(
      userId,
      dto.accountId,
      dto.amount,
      dto.description,
      idempotencyKey,
    );
  }

  @Post('ach')
  @ApiOperation({ summary: 'Simulate ACH withdrawal to external account' })
  async achWithdrawal(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalsService.simulateACHWithdrawal(
      userId,
      dto.accountId,
      dto.amount,
      dto.routingNumber,
      dto.accountNumber,
    );
  }
}
