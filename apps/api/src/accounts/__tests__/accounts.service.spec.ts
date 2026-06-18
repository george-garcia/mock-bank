import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsService } from '../accounts.service';
import { AccountsRepository } from '../accounts.repository';
import { LedgerService } from '../../ledger/ledger.service';

describe('AccountsService', () => {
  let service: AccountsService;
  let repository: jest.Mocked<Pick<AccountsRepository, 'create' | 'findById' | 'findByUserId'>>;
  let ledger: jest.Mocked<Pick<LedgerService, 'openCustomerAccount' | 'getBalances'>>;

  const mockAccount = {
    id: 1,
    userId: 1,
    type: 'checking' as const,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = { create: jest.fn(), findById: jest.fn(), findByUserId: jest.fn() };
    ledger = { openCustomerAccount: jest.fn(), getBalances: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: AccountsRepository, useValue: repository },
        { provide: LedgerService, useValue: ledger },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  describe('create', () => {
    it('creates the account, opens its ledger account, and returns a zero balance', async () => {
      repository.create.mockResolvedValue(mockAccount);

      const result = await service.create(1, { type: 'checking' });

      expect(repository.create).toHaveBeenCalledWith({ userId: 1, type: 'checking', status: 'active' });
      expect(ledger.openCustomerAccount).toHaveBeenCalledWith(1, 'checking');
      expect(result.balance).toBe('0.00');
    });
  });

  describe('findOne', () => {
    it('returns the account with its posted + available balance when owned by the user', async () => {
      repository.findById.mockResolvedValue(mockAccount);
      ledger.getBalances.mockResolvedValue(new Map([[1, { balance: '150.00', available: '120.00' }]]));

      const result = await service.findOne(1, 1);

      expect(result).toMatchObject({ id: 1, balance: '150.00', availableBalance: '120.00' });
    });

    it('throws NotFoundException if the account does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if the account belongs to another user', async () => {
      repository.findById.mockResolvedValue({ ...mockAccount, userId: 2 });
      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByUser', () => {
    it('attaches each posted + available balance', async () => {
      repository.findByUserId.mockResolvedValue([mockAccount, { ...mockAccount, id: 2 }]);
      ledger.getBalances.mockResolvedValue(
        new Map([
          [1, { balance: '10.00', available: '10.00' }],
          [2, { balance: '20.00', available: '5.00' }],
        ]),
      );

      const result = await service.findAllByUser(1);

      expect(result[0].balance).toBe('10.00');
      expect(result[1]).toMatchObject({ balance: '20.00', availableBalance: '5.00' });
    });
  });
});
