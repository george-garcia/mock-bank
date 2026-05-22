import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';

@ApiTags('Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Post()
  @ApiOperation({ summary: 'Issue a new virtual card' })
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateCardDto,
  ) {
    return this.cardsService.createCard(userId, dto.accountId, {
      spendLimit: dto.spendLimit,
      spendLimitPeriod: dto.spendLimitPeriod,
      memo: dto.memo,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all user cards' })
  async findAll(@CurrentUser('sub') userId: number) {
    return this.cardsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card by ID' })
  async findOne(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cardsService.findOne(id, userId);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get card transaction history' })
  async getTransactions(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cardsService.findCardTransactions(id, userId);
  }

  @Patch(':id/freeze')
  @ApiOperation({ summary: 'Freeze a card' })
  async freeze(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cardsService.freezeCard(id, userId);
  }

  @Patch(':id/unfreeze')
  @ApiOperation({ summary: 'Unfreeze a card' })
  async unfreeze(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cardsService.unfreezeCard(id, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a card' })
  async cancel(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cardsService.cancelCard(id, userId);
  }
}
