import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private withdrawalsService: WithdrawalsService) {}

  @Post()
  @ApiOperation({ summary: 'Withdraw funds from account' })
  async withdraw(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalsService.withdraw(
      userId,
      dto.accountId,
      dto.amount,
      dto.description,
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
