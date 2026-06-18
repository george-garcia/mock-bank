import { Test, TestingModule } from '@nestjs/testing';
import { ClearingService } from '../clearing.service';
import { LedgerService } from '../../ledger/ledger.service';
import { AuditService } from '../../audit/audit.service';
import { PendingDepositsRepository } from '../pending-deposits.repository';

describe('ClearingService', () => {
  let service: ClearingService;
  let pendingRepo: jest.Mocked<Pick<PendingDepositsRepository, 'findDue' | 'markCleared'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'deposit' | 'expireHolds'>>;
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    pendingRepo = { findDue: jest.fn().mockResolvedValue([]), markCleared: jest.fn() };
    ledger = {
      deposit: jest.fn().mockResolvedValue({ transaction: { id: 50 }, entries: [], idempotentReplay: false }),
      expireHolds: jest.fn().mockResolvedValue(0),
    };
    audit = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearingService,
        { provide: PendingDepositsRepository, useValue: pendingRepo },
        { provide: LedgerService, useValue: ledger },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ClearingService>(ClearingService);
  });

  it('posts each due deposit to the ledger (using its idempotency key) and marks it cleared', async () => {
    pendingRepo.findDue.mockResolvedValue([
      { id: 1, accountId: 7, amountMinor: 25000, description: 'ACH', idempotencyKey: 'deposit:abc' } as any,
      { id: 2, accountId: 8, amountMinor: 100, description: null, idempotencyKey: 'deposit:def' } as any,
    ]);

    const cleared = await service.clearDueDeposits(new Date());

    expect(cleared).toBe(2);
    expect(ledger.deposit).toHaveBeenCalledWith(7, expect.objectContaining({ amount: '250.00', idempotencyKey: 'deposit:abc' }));
    expect(ledger.deposit).toHaveBeenCalledWith(8, expect.objectContaining({ amount: '1.00', idempotencyKey: 'deposit:def' }));
    expect(pendingRepo.markCleared).toHaveBeenCalledWith(1, 50);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'money.deposit_cleared' }));
  });

  it('keeps a deposit pending (does not mark cleared) if posting fails', async () => {
    pendingRepo.findDue.mockResolvedValue([
      { id: 1, accountId: 7, amountMinor: 25000, description: 'ACH', idempotencyKey: 'deposit:abc' } as any,
    ]);
    ledger.deposit.mockRejectedValue(new Error('db down'));

    const cleared = await service.clearDueDeposits(new Date());

    expect(cleared).toBe(0);
    expect(pendingRepo.markCleared).not.toHaveBeenCalled();
  });

  it('runClearingCycle also expires holds', async () => {
    ledger.expireHolds.mockResolvedValue(3);
    await service.runClearingCycle();
    expect(ledger.expireHolds).toHaveBeenCalled();
  });
});
