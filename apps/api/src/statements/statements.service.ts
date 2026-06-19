import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Statement } from '@mock-bank/database';
import { AccountsService } from '../accounts/accounts.service';
import { LedgerService } from '../ledger/ledger.service';
import { StatementsRepository } from './statements.repository';
import { toDecimalString } from '../common/money';

@Injectable()
export class StatementsService {
  constructor(
    private accountsService: AccountsService,
    private ledgerService: LedgerService,
    private repo: StatementsRepository,
  ) {}

  /** Generate and persist an immutable statement for an account over a period. */
  async generate(userId: number, input: { accountId: number; periodStart: string; periodEnd: string }) {
    await this.accountsService.findOne(input.accountId, userId); // ownership

    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('Invalid statement period');
    }

    const data = await this.ledgerService.statementData(input.accountId, start, end);
    const stmt = await this.repo.create({
      accountId: input.accountId,
      periodStart: start,
      periodEnd: end,
      openingBalanceMinor: data.openingMinor,
      closingBalanceMinor: data.closingMinor,
      totalCreditsMinor: data.totalCreditsMinor,
      totalDebitsMinor: data.totalDebitsMinor,
      transactionCount: data.lines.length,
      lines: JSON.stringify(data.lines),
    });
    return this.present(stmt);
  }

  async listForAccount(userId: number, accountId: number) {
    await this.accountsService.findOne(accountId, userId); // ownership
    const rows = await this.repo.findByAccount(accountId);
    return rows.map((r) => this.summary(r));
  }

  async getOne(userId: number, id: number) {
    const stmt = await this.repo.findById(id);
    if (!stmt) throw new NotFoundException('Statement not found');
    await this.accountsService.findOne(stmt.accountId, userId); // ownership
    return this.present(stmt);
  }

  private summary(s: Statement) {
    return {
      id: s.id,
      accountId: s.accountId,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      openingBalance: toDecimalString(s.openingBalanceMinor),
      closingBalance: toDecimalString(s.closingBalanceMinor),
      totalCredits: toDecimalString(s.totalCreditsMinor),
      totalDebits: toDecimalString(s.totalDebitsMinor),
      transactionCount: s.transactionCount,
      createdAt: s.createdAt,
    };
  }

  private present(s: Statement) {
    return { ...this.summary(s), lines: JSON.parse(s.lines) };
  }
}
