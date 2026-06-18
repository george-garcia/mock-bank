import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransfersService } from '../transfers.service';
import { AccountsService } from '../../accounts/accounts.service';
import { LedgerService } from '../../ledger/ledger.service';
import { AuditService } from '../../audit/audit.service';

describe('TransfersService', () => {
  let service: TransfersService;
  let accounts: jest.Mocked<Pick<AccountsService, 'findOne'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'transfer'>>;
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    accounts = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1 }) };
    ledger = {
      transfer: jest.fn().mockResolvedValue({ transaction: { id: 8, type: 'transfer' }, entries: [], idempotentReplay: false }),
    };
    audit = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        { provide: AccountsService, useValue: accounts },
        { provide: LedgerService, useValue: ledger },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
  });

  describe('transfer', () => {
    it('verifies ownership of both accounts and posts one ledger transfer', async () => {
      const result = await service.transfer(1, 1, 2, '50.00');
      expect(accounts.findOne).toHaveBeenCalledWith(1, 1);
      expect(accounts.findOne).toHaveBeenCalledWith(2, 1);
      expect(ledger.transfer).toHaveBeenCalledWith(1, 2, expect.objectContaining({ amount: '50.00' }));
      expect(result.fromTransaction.accountId).toBe(1);
      expect(result.toTransaction.accountId).toBe(2);
    });

    it('passes a custom description through', async () => {
      await service.transfer(1, 1, 2, '50.00', 'Rent payment');
      expect(ledger.transfer).toHaveBeenCalledWith(1, 2, expect.objectContaining({ description: 'Rent payment' }));
    });

    it('propagates the ledger insufficient-funds error', async () => {
      ledger.transfer.mockRejectedValue(new BadRequestException('Insufficient funds'));
      await expect(service.transfer(1, 1, 2, '5000.00')).rejects.toThrow(BadRequestException);
    });

    it('propagates an ownership failure', async () => {
      accounts.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.transfer(1, 1, 9, '5.00')).rejects.toThrow(NotFoundException);
    });
  });
});
