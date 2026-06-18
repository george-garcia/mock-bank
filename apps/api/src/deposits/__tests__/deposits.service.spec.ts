import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DepositsService } from '../deposits.service';
import { AccountsService } from '../../accounts/accounts.service';
import { LedgerService } from '../../ledger/ledger.service';

describe('DepositsService', () => {
  let service: DepositsService;
  let accounts: jest.Mocked<Pick<AccountsService, 'findOne'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'deposit'>>;

  beforeEach(async () => {
    accounts = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1 }) };
    ledger = {
      deposit: jest.fn().mockResolvedValue({ transaction: { id: 7, type: 'deposit' }, entries: [], idempotentReplay: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: AccountsService, useValue: accounts },
        { provide: LedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get<DepositsService>(DepositsService);
  });

  describe('simulateDeposit', () => {
    it('checks ownership, posts via the ledger, and reports completed', async () => {
      const result = await service.simulateDeposit(1, { accountId: 1, amount: '100.00', instant: true });

      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(ledger.deposit).toHaveBeenCalledWith(1, expect.objectContaining({ amount: '100.00' }));
      expect(result.status).toBe('completed');
      expect(result.transaction.amount).toBe('100.00');
    });

    it('propagates an ownership failure without posting', async () => {
      accounts.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.simulateDeposit(1, { accountId: 9, amount: '5.00' })).rejects.toThrow(NotFoundException);
      expect(ledger.deposit).not.toHaveBeenCalled();
    });
  });

  describe('simulateDirectDeposit', () => {
    it('defaults the payroll description', async () => {
      await service.simulateDirectDeposit(1, { accountId: 1, amount: '500.00' });
      expect(ledger.deposit).toHaveBeenCalledWith(1, expect.objectContaining({ description: 'Direct deposit - Payroll' }));
    });
  });

  describe('simulatePayrollDeposit', () => {
    it('posts a payroll deposit', async () => {
      const result = await service.simulatePayrollDeposit(1, 1, '2500.00');
      expect(ledger.deposit).toHaveBeenCalledWith(1, expect.objectContaining({ description: 'Payroll deposit' }));
      expect(result.status).toBe('completed');
    });
  });
});
