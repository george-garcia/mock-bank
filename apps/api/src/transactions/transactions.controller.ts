import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new transaction' })
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.recordTransaction(userId, {
      accountId: dto.accountId,
      type: dto.type as any,
      amount: dto.amount,
      description: dto.description,
    });
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get transaction history for an account' })
  async findByAccount(
    @CurrentUser('sub') userId: number,
    @Param('accountId', ParseIntPipe) accountId: number,
  ) {
    return this.transactionsService.findByAccountId(accountId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findOne(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.findOne(id, userId);
  }
}
