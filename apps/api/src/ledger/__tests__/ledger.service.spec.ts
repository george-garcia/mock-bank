import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerService } from '../ledger.service';
import { LedgerRepository } from '../ledger.repository';

describe('LedgerService', () => {
  let service: LedgerService;
  let repo: jest.Mocked<
    Pick<LedgerRepository,
      'customerLedgerAccountId' | 'systemLedgerAccountId' | 'createCustomerLedgerAccount' |
      'balanceMinorForAccount' | 'balancesForAccounts' | 'historyForAccount' | 'post'>
  >;

  beforeEach(async () => {
    repo = {
      customerLedgerAccountId: jest.fn(),
      systemLedgerAccountId: jest.fn(),
      createCustomerLedgerAccount: jest.fn(),
      balanceMinorForAccount: jest.fn(),
      balancesForAccounts: jest.fn(),
      historyForAccount: jest.fn(),
      post: jest.fn().mockResolvedValue({ transaction: { id: 99 }, entries: [], idempotentReplay: false }),
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

  describe('cardSettlement', () => {
    it('posts debit customer, credit card_network and allows overdraft', async () => {
      repo.customerLedgerAccountId.mockResolvedValue(10);
      repo.systemLedgerAccountId.mockResolvedValue(2); // card_network

      await service.cardSettlement(5, { amount: '9.99', idempotencyKey: 'card_settlement:tok' });

      expect(repo.post).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'card_settlement',
          allowNegative: true,
          entries: [
            { ledgerAccountId: 10, direction: 'debit', amountMinor: 999 },
            { ledgerAccountId: 2, direction: 'credit', amountMinor: 999 },
          ],
        }),
      );
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

  describe('getBalances', () => {
    it('formats minor balances to decimal strings', async () => {
      repo.balancesForAccounts.mockResolvedValue(new Map([[5, 12345], [6, 0]]));
      const balances = await service.getBalances([5, 6]);
      expect(balances.get(5)).toBe('123.45');
      expect(balances.get(6)).toBe('0.00');
    });
  });
});
