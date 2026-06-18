import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WithdrawalsService } from '../withdrawals.service';
import { AccountsService } from '../../accounts/accounts.service';
import { LedgerService } from '../../ledger/ledger.service';

describe('WithdrawalsService', () => {
  let service: WithdrawalsService;
  let accounts: jest.Mocked<Pick<AccountsService, 'findOne'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'withdraw'>>;

  beforeEach(async () => {
    accounts = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1 }) };
    ledger = {
      withdraw: jest.fn().mockResolvedValue({ transaction: { id: 5, type: 'withdrawal' }, entries: [], idempotentReplay: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalsService,
        { provide: AccountsService, useValue: accounts },
        { provide: LedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get<WithdrawalsService>(WithdrawalsService);
  });

  describe('withdraw', () => {
    it('checks ownership and posts via the ledger', async () => {
      const result = await service.withdraw(1, 1, '50.00');
      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(ledger.withdraw).toHaveBeenCalledWith(1, expect.objectContaining({ amount: '50.00' }));
      expect(result.status).toBe('completed');
    });

    it('passes a custom description through', async () => {
      await service.withdraw(1, 1, '50.00', 'ATM withdrawal');
      expect(ledger.withdraw).toHaveBeenCalledWith(1, expect.objectContaining({ description: 'ATM withdrawal' }));
    });

    it('propagates the ledger insufficient-funds error', async () => {
      ledger.withdraw.mockRejectedValue(new BadRequestException('Insufficient funds'));
      await expect(service.withdraw(1, 1, '5000.00')).rejects.toThrow(BadRequestException);
    });

    it('propagates an ownership failure without posting', async () => {
      accounts.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.withdraw(1, 9, '5.00')).rejects.toThrow(NotFoundException);
      expect(ledger.withdraw).not.toHaveBeenCalled();
    });
  });

  describe('simulateACHWithdrawal', () => {
    it('delegates to withdraw', async () => {
      const result = await service.simulateACHWithdrawal(1, 1, '50.00', '123', '456');
      expect(result.status).toBe('completed');
    });
  });
});
