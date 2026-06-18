import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from '../transactions.service';
import { AccountsService } from '../../accounts/accounts.service';
import { LedgerService } from '../../ledger/ledger.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let accounts: jest.Mocked<Pick<AccountsService, 'findOne'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'deposit' | 'withdraw' | 'historyForAccount'>>;

  beforeEach(async () => {
    accounts = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1 }) };
    ledger = { deposit: jest.fn(), withdraw: jest.fn(), historyForAccount: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: AccountsService, useValue: accounts },
        { provide: LedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  describe('recordTransaction', () => {
    it('checks ownership then posts a deposit through the ledger', async () => {
      await service.recordTransaction(1, { accountId: 1, type: 'deposit', amount: '100.00' });
      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(ledger.deposit).toHaveBeenCalledWith(1, expect.objectContaining({ amount: '100.00' }));
    });

    it('posts a withdrawal through the ledger', async () => {
      await service.recordTransaction(1, { accountId: 1, type: 'withdrawal', amount: '40.00' });
      expect(ledger.withdraw).toHaveBeenCalledWith(1, expect.objectContaining({ amount: '40.00' }));
    });

    it('rejects unsupported types', async () => {
      await expect(
        service.recordTransaction(1, { accountId: 1, type: 'transfer', amount: '1.00' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates an ownership failure', async () => {
      accounts.findOne.mockRejectedValue(new NotFoundException());
      await expect(
        service.recordTransaction(1, { accountId: 9, type: 'deposit', amount: '1.00' }),
      ).rejects.toThrow(NotFoundException);
      expect(ledger.deposit).not.toHaveBeenCalled();
    });
  });

  describe('findByAccountId', () => {
    it('checks ownership then returns ledger history', async () => {
      ledger.historyForAccount.mockResolvedValue([{ id: 1 }] as any);
      const result = await service.findByAccountId(1, 1);
      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
