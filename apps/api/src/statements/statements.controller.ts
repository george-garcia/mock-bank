import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StatementsService } from './statements.service';
import { GenerateStatementDto } from './dto/generate-statement.dto';

@ApiTags('Statements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statements')
export class StatementsController {
  constructor(private statementsService: StatementsService) {}

  @Post()
  @ApiOperation({ summary: 'Generate an immutable statement for an account + period' })
  async generate(@CurrentUser('sub') userId: number, @Body() dto: GenerateStatementDto) {
    return this.statementsService.generate(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List statements for an account' })
  async list(@CurrentUser('sub') userId: number, @Query('accountId', ParseIntPipe) accountId: number) {
    return this.statementsService.listForAccount(userId, accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a statement with its line items' })
  async getOne(@CurrentUser('sub') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.statementsService.getOne(userId, id);
  }
}
