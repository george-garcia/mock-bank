import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../transactions.service';
import { TransactionsRepository } from '../transactions.repository';
import { AccountsService } from '../../accounts/accounts.service';
import { AccountsRepository } from '../../accounts/accounts.repository';
import { NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepo: TransactionsRepository;

  const mockTransaction = {
    id: 1,
    accountId: 1,
    type: 'deposit' as const,
    amount: '100.00',
    balanceAfter: '100.00',
    description: 'Test deposit',
    status: 'completed' as const,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransactionsRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByAccountId: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockAccountsRepo = {
    findById: jest.fn(),
    updateBalance: jest.fn(),
  };

  const mockAccountsService = {
    findOne: jest.fn(),
    updateBalance: jest.fn(),
    findAllByUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: mockTransactionsRepo },
        { provide: AccountsRepository, useValue: mockAccountsRepo },
        { provide: AccountsService, useValue: mockAccountsService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepo = module.get<TransactionsRepository>(TransactionsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordTransaction', () => {
    it('should record a deposit and update balance', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsRepo.create.mockResolvedValue(mockTransaction);
      mockAccountsService.updateBalance.mockResolvedValue({ id: 1, balance: '150.00' });

      const result = await service.recordTransaction(1, {
        accountId: 1,
        type: 'deposit',
        amount: '100.00',
        description: 'Test deposit',
      });

      expect(result).toEqual(mockTransaction);
      expect(mockAccountsService.findOne).toHaveBeenCalledWith(1, 1);
      expect(mockAccountsService.updateBalance).toHaveBeenCalledWith(1, 1, '100.00');
    });

    it('should record a withdrawal with negative amount', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsRepo.create.mockResolvedValue({ ...mockTransaction, type: 'withdrawal' as const });
      mockAccountsService.updateBalance.mockResolvedValue({ id: 1, balance: '50.00' });

      await service.recordTransaction(1, {
        accountId: 1,
        type: 'withdrawal',
        amount: '50.00',
        description: 'Test withdrawal',
      });

      expect(mockAccountsService.updateBalance).toHaveBeenCalledWith(1, 1, '-50.00');
    });

    it('should throw if account not found', async () => {
      mockAccountsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.recordTransaction(1, {
        accountId: 999,
        type: 'deposit',
        amount: '100.00',
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPendingTransaction', () => {
    it('should create a pending transaction without updating balance', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsRepo.create.mockResolvedValue({ ...mockTransaction, status: 'pending' as const });

      const result = await service.createPendingTransaction(1, {
        accountId: 1,
        type: 'deposit',
        amount: '100.00',
        description: 'Pending deposit',
      });

      expect(result.status).toBe('pending');
      expect(mockAccountsService.updateBalance).not.toHaveBeenCalled();
    });
  });

  describe('completeTransaction', () => {
    it('should complete a pending transaction and update balance', async () => {
      mockTransactionsRepo.findById
        .mockResolvedValueOnce({
          ...mockTransaction,
          status: 'pending' as const,
          accountId: 1,
          amount: '100.00',
          type: 'deposit' as const,
        })
        .mockResolvedValueOnce({ ...mockTransaction, status: 'completed' as const });
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsRepo.updateStatus.mockResolvedValue({ ...mockTransaction, status: 'completed' as const });
      mockAccountsService.updateBalance.mockResolvedValue({ id: 1, balance: '150.00' });

      const result = await service.completeTransaction(1, 1);

      expect(result.status).toBe('completed');
      expect(mockAccountsService.updateBalance).toHaveBeenCalledWith(1, 1, '100.00');
    });

    it('should throw if transaction not found', async () => {
      mockTransactionsRepo.findById.mockResolvedValue(null);

      await expect(service.completeTransaction(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAccountId', () => {
    it('should return transactions for an account', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsRepo.findByAccountId.mockResolvedValue([mockTransaction]);

      const result = await service.findByAccountId(1, 1);

      expect(result).toEqual([mockTransaction]);
      expect(mockTransactionsRepo.findByAccountId).toHaveBeenCalledWith(1);
    });
  });
});
