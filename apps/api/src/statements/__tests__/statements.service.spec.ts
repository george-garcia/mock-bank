import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatementsService } from '../statements.service';
import { AccountsService } from '../../accounts/accounts.service';
import { LedgerService } from '../../ledger/ledger.service';
import { StatementsRepository } from '../statements.repository';

describe('StatementsService', () => {
  let service: StatementsService;
  let accounts: jest.Mocked<Pick<AccountsService, 'findOne'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'statementData'>>;
  let repo: jest.Mocked<Pick<StatementsRepository, 'create' | 'findById' | 'findByAccount'>>;

  beforeEach(async () => {
    accounts = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1 }) };
    ledger = {
      statementData: jest.fn().mockResolvedValue({
        openingMinor: 100000,
        closingMinor: 130000,
        totalCreditsMinor: 50000,
        totalDebitsMinor: 20000,
        lines: [{ amount: '500.00' }, { amount: '-200.00' }],
      }),
    };
    repo = {
      create: jest.fn().mockImplementation(async (d) => ({ id: 1, ...d, createdAt: new Date() })),
      findById: jest.fn(),
      findByAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatementsService,
        { provide: AccountsService, useValue: accounts },
        { provide: LedgerService, useValue: ledger },
        { provide: StatementsRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(StatementsService);
  });

  describe('generate', () => {
    it('checks ownership, computes from the ledger, and persists an immutable snapshot', async () => {
      const result = await service.generate(1, { accountId: 1, periodStart: '2026-05-01', periodEnd: '2026-06-01' });

      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(ledger.statementData).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 1, openingBalanceMinor: 100000, closingBalanceMinor: 130000, transactionCount: 2, lines: expect.any(String) }),
      );
      expect(result).toMatchObject({ openingBalance: '1000.00', closingBalance: '1300.00', totalCredits: '500.00', totalDebits: '200.00' });
      expect(result.lines).toHaveLength(2);
    });

    it('rejects an invalid period (end <= start)', async () => {
      await expect(service.generate(1, { accountId: 1, periodStart: '2026-06-01', periodEnd: '2026-05-01' })).rejects.toThrow(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    it('returns the statement with parsed lines after an ownership check', async () => {
      repo.findById.mockResolvedValue({
        id: 9, accountId: 1, periodStart: new Date(), periodEnd: new Date(),
        openingBalanceMinor: 0, closingBalanceMinor: 500, totalCreditsMinor: 500, totalDebitsMinor: 0,
        transactionCount: 1, lines: '[{"amount":"5.00"}]', createdAt: new Date(),
      } as any);

      const result = await service.getOne(1, 9);

      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(result.lines).toEqual([{ amount: '5.00' }]);
      expect(result.closingBalance).toBe('5.00');
    });

    it('throws when the statement does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
