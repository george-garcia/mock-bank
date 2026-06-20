import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerService } from '../ledger.service';
import { LedgerRepository } from '../ledger.repository';

describe('LedgerService', () => {
  let service: LedgerService;
  let repo: jest.Mocked<
    Pick<LedgerRepository,
      'customerLedgerAccountId' | 'systemLedgerAccountId' | 'createCustomerLedgerAccount' |
      'balanceMinorForAccount' | 'balancesForAccounts' | 'activeHoldsForAccounts' |
      'historyForAccount' | 'post' | 'placeHold' | 'resolveHold' | 'reverse' | 'expireHolds' |
      'signedSumBefore' | 'entriesBetween'>
  >;

  beforeEach(async () => {
    repo = {
      customerLedgerAccountId: jest.fn(),
      systemLedgerAccountId: jest.fn(),
      createCustomerLedgerAccount: jest.fn(),
      balanceMinorForAccount: jest.fn(),
      balancesForAccounts: jest.fn(),
      activeHoldsForAccounts: jest.fn().mockResolvedValue(new Map()),
      historyForAccount: jest.fn(),
      post: jest.fn().mockResolvedValue({ transaction: { id: 99 }, entries: [], idempotentReplay: false }),
      placeHold: jest.fn(),
      resolveHold: jest.fn(),
      reverse: jest.fn().mockResolvedValue({ transaction: { id: 100 }, entries: [], idempotentReplay: false }),
      expireHolds: jest.fn().mockResolvedValue(2),
      signedSumBefore: jest.fn(),
      entriesBetween: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [LedgerService, { provide: LedgerRepository, useValue: repo }],
    }).compile();
    service = module.get(LedgerService);
  });

  describe('deposit', () => {
    it('posts a balanced journal: debit bank_cash, credit customer (in minor units)', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      repo.systemLedgerAccountId.mockResolvedValue(1); // bank_cash

      await service.deposit(5, { amount: '123.45', idempotencyKey: 'idem-1' });

      expect(repo.post).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'idem-1',
          type: 'deposit',
          entries: [
            { ledgerAccountId: 1, direction: 'debit', amountMinor: 12345 },
            { ledgerAccountId: 10, direction: 'credit', amountMinor: 12345 },
          ],
        }),
      );
    });

    it('rejects a non-positive amount', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      await expect(service.deposit(5, { amount: '0' })).rejects.toThrow(BadRequestException);
      expect(repo.post).not.toHaveBeenCalled();
    });

    it('throws when the account does not exist', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(null);
      await expect(service.deposit(5, { amount: '10.00' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('withdraw', () => {
    it('posts debit customer, credit bank_cash', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      repo.systemLedgerAccountId.mockResolvedValue(1);

      await service.withdraw(5, { amount: '20.00', idempotencyKey: 'idem-2' });

      expect(repo.post).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'withdrawal',
          entries: [
            { ledgerAccountId: 10, direction: 'debit', amountMinor: 2000 },
            { ledgerAccountId: 1, direction: 'credit', amountMinor: 2000 },
          ],
        }),
      );
    });
  });

  describe('transfer', () => {
    it('posts a single balanced journal: debit from, credit to', async () => {
      repo.customerLedgerAccountId.mockResolvedValueOnce(10).mockResolvedValueOnce(20);

      await service.transfer(5, 6, { amount: '75.00', idempotencyKey: 'idem-3' });

      expect(repo.post).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transfer',
          entries: [
            { ledgerAccountId: 10, direction: 'debit', amountMinor: 7500 },
            { ledgerAccountId: 20, direction: 'credit', amountMinor: 7500 },
          ],
        }),
      );
    });

    it('rejects transferring to the same account', async () => {
      await expect(service.transfer(5, 5, { amount: '1.00' })).rejects.toThrow(BadRequestException);
      expect(repo.post).not.toHaveBeenCalled();
    });
  });

  describe('cardClearing', () => {
    it('posts debit customer, credit card_network and allows overdraft', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      repo.systemLedgerAccountId.mockResolvedValue(2); // card_network

      await service.cardClearing(5, { amount: '9.99', idempotencyKey: 'card_clearing:tok' });

      expect(repo.post).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'card_clearing',
          allowNegative: true,
          entries: [
            { ledgerAccountId: 10, direction: 'debit', amountMinor: 999 },
            { ledgerAccountId: 2, direction: 'credit', amountMinor: 999 },
          ],
        }),
      );
    });
  });

  describe('cardReturn', () => {
    it('credits the customer and debits card_network (money back to the account)', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      repo.systemLedgerAccountId.mockResolvedValue(2); // card_network

      await service.cardReturn(5, { amount: '12.34', idempotencyKey: 'return:tok' });

      expect(repo.post).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'return',
          entries: [
            { ledgerAccountId: 2, direction: 'debit', amountMinor: 1234 },
            { ledgerAccountId: 10, direction: 'credit', amountMinor: 1234 },
          ],
        }),
      );
    });
  });

  describe('reverse / expireHolds', () => {
    it('delegates reverse to the repository', async () => {
      await service.reverse(42, 'returned');
      expect(repo.reverse).toHaveBeenCalledWith(42, 'returned');
    });

    it('delegates expireHolds to the repository', async () => {
      const n = await service.expireHolds();
      expect(repo.expireHolds).toHaveBeenCalled();
      expect(n).toBe(2);
    });
  });

  describe('historyForAccount', () => {
    it('maps credits to positive and debits to negative amounts', async () => {
      repo.historyForAccount.mockResolvedValue([
        { id: 1, direction: 'credit', amountMinor: 5000, createdAt: new Date(), transactionId: 1, type: 'deposit', status: 'posted', description: 'd' },
        { id: 2, direction: 'debit', amountMinor: 2000, createdAt: new Date(), transactionId: 2, type: 'withdrawal', status: 'posted', description: 'w' },
      ] as any);

      const history = await service.historyForAccount(5);

      expect(history[0].amount).toBe('50.00');
      expect(history[1].amount).toBe('-20.00');
    });
  });

  describe('statementData', () => {
    it('computes opening/closing balances and credit/debit totals from the ledger', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      repo.signedSumBefore.mockResolvedValue(100000); // $1000 opening
      repo.entriesBetween.mockResolvedValue([
        { id: 1, direction: 'credit', amountMinor: 50000, createdAt: new Date(), transactionId: 1, type: 'deposit', status: 'posted', description: 'pay' },
        { id: 2, direction: 'debit', amountMinor: 20000, createdAt: new Date(), transactionId: 2, type: 'withdrawal', status: 'posted', description: 'atm' },
      ] as any);

      const data = await service.statementData(5, new Date('2026-05-01'), new Date('2026-06-01'));

      expect(data.openingMinor).toBe(100000);
      expect(data.totalCreditsMinor).toBe(50000);
      expect(data.totalDebitsMinor).toBe(20000);
      expect(data.closingMinor).toBe(130000); // 1000 + 500 - 200 = 1300
      expect(data.lines[0].amount).toBe('500.00');
      expect(data.lines[1].amount).toBe('-200.00');
    });
  });

  describe('getBalances', () => {
    it('returns posted balance and available (posted − active holds)', async () => {
      repo.balancesForAccounts.mockResolvedValue(new Map([[5, 12345], [6, 5000]]));
      repo.activeHoldsForAccounts.mockResolvedValue(new Map([[5, 2345]]));

      const balances = await service.getBalances([5, 6]);

      expect(balances.get(5)).toEqual({ balance: '123.45', available: '100.00' });
      expect(balances.get(6)).toEqual({ balance: '50.00', available: '50.00' });
    });
  });

  describe('holds', () => {
    it('placeHold resolves the customer ledger account and reserves funds', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      await service.placeHold(5, { amount: '40.00', externalRef: 'auth:tok' });
      expect(repo.placeHold).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerAccountId: 10, amountMinor: 4000, type: 'authorization', externalRef: 'auth:tok' }),
      );
    });

    it('captureHold and releaseHold resolve the hold with the right status', async () => {
      await service.captureHold('card_auth:tok');
      expect(repo.resolveHold).toHaveBeenCalledWith('card_auth:tok', 'captured');
      await service.releaseHold('card_auth:tok');
      expect(repo.resolveHold).toHaveBeenCalledWith('card_auth:tok', 'released');
    });

    it('getAvailableBalance subtracts active holds from posted', async () => {
      repo.balanceMinorForAccount.mockResolvedValue(10000);
      repo.activeHoldsForAccounts.mockResolvedValue(new Map([[5, 2500]]));
      expect(await service.getAvailableBalance(5)).toBe('75.00');
    });
  });
});
