import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  async create(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(userId, { type: dto.type });
  }

  @Get()
  @ApiOperation({ summary: 'List all user accounts' })
  async findAll(@CurrentUser('sub') userId: number) {
    return this.accountsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  async findOne(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountsService.findOne(id, userId);
  }

}
