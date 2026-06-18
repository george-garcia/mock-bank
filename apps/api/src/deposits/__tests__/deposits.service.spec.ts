import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { DepositsService } from '../deposits.service';
import { AccountsService } from '../../accounts/accounts.service';
import { LedgerService } from '../../ledger/ledger.service';
import { AuditService } from '../../audit/audit.service';
import { PendingDepositsRepository } from '../pending-deposits.repository';

describe('DepositsService', () => {
  let service: DepositsService;
  let accounts: jest.Mocked<Pick<AccountsService, 'findOne' | 'findAllByUser'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'deposit'>>;
  let pendingRepo: jest.Mocked<Pick<PendingDepositsRepository, 'create' | 'findByAccounts'>>;
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    accounts = {
      findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1 }),
      findAllByUser: jest.fn(),
    };
    ledger = {
      deposit: jest.fn().mockResolvedValue({ transaction: { id: 7, type: 'deposit' }, entries: [], idempotentReplay: false }),
    };
    pendingRepo = {
      create: jest.fn().mockResolvedValue({ id: 99 }),
      findByAccounts: jest.fn(),
    };
    audit = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: AccountsService, useValue: accounts },
        { provide: LedgerService, useValue: ledger },
        { provide: AuditService, useValue: audit },
        { provide: PendingDepositsRepository, useValue: pendingRepo },
        { provide: ConfigService, useValue: { get: (_k: string, d?: string) => d } },
      ],
    }).compile();

    service = module.get<DepositsService>(DepositsService);
  });

  describe('simulateDeposit', () => {
    it('instant: posts to the ledger immediately and reports completed', async () => {
      const result = await service.simulateDeposit(1, { accountId: 1, amount: '100.00', instant: true });

      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(ledger.deposit).toHaveBeenCalledWith(1, expect.objectContaining({ amount: '100.00' }));
      expect(pendingRepo.create).not.toHaveBeenCalled();
      expect(result.status).toBe('completed');
    });

    it('non-instant: queues a durable pending deposit and does NOT credit yet', async () => {
      const result = await service.simulateDeposit(1, { accountId: 1, amount: '250.00' });

      expect(ledger.deposit).not.toHaveBeenCalled();
      expect(pendingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 1, amountMinor: 25000, clearAt: expect.any(Date), idempotencyKey: expect.any(String) }),
      );
      expect(result.status).toBe('pending');
      expect(result).toHaveProperty('clearAt');
    });

    it('propagates an ownership failure without queuing', async () => {
      accounts.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.simulateDeposit(1, { accountId: 9, amount: '5.00' })).rejects.toThrow(NotFoundException);
      expect(pendingRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('simulatePayrollDeposit', () => {
    it('queues a pending payroll deposit', async () => {
      const result = await service.simulatePayrollDeposit(1, 1, '2500.00');
      expect(pendingRepo.create).toHaveBeenCalledWith(expect.objectContaining({ description: 'Payroll deposit', amountMinor: 250000 }));
      expect(result.status).toBe('pending');
    });
  });

  describe('listPending', () => {
    it('returns the user\'s pending deposits with decimal amounts', async () => {
      accounts.findAllByUser.mockResolvedValue([{ id: 1 } as any]);
      pendingRepo.findByAccounts.mockResolvedValue([
        { id: 5, accountId: 1, amountMinor: 25000, description: 'x', status: 'pending', clearAt: new Date(), createdAt: new Date() } as any,
      ]);
      const result = await service.listPending(1);
      expect(result[0]).toMatchObject({ id: 5, amount: '250.00', status: 'pending' });
    });
  });
});
