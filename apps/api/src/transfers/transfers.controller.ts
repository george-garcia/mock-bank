import { Controller, Post, Body, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@ApiTags('Transfers')
@ApiBearerAuth()
@ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Dedupe key for safe retries' })
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Transfer between own accounts' })
  async transfer(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateTransferDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.transfersService.transfer(
      userId,
      dto.fromAccountId,
      dto.toAccountId,
      dto.amount,
      dto.description,
      idempotencyKey,
    );
  }
}
