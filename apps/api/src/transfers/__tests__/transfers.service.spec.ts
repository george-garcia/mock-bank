import { Test, TestingModule } from '@nestjs/testing';
import { TransfersService } from '../transfers.service';
import { AccountsService } from '../../accounts/accounts.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { BadRequestException } from '@nestjs/common';

describe('TransfersService', () => {
  let service: TransfersService;
  let accountsService: AccountsService;
  let transactionsService: TransactionsService;

  const mockAccount = (id: number, balance: string) => ({
    id,
    userId: 1,
    balance,
    name: 'Checking',
    status: 'active',
    type: 'checking',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockTransaction = {
    id: 1,
    userId: 1,
    accountId: 1,
    type: 'transfer',
    amount: '50.00',
    balanceAfter: '50.00',
    description: 'Test transfer',
    status: 'completed',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccountsService = {
    findOne: jest.fn(),
  };

  const mockTransactionsService = {
    recordTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransfersService,
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    service = module.get<TransfersService>(TransfersService);
    accountsService = module.get<AccountsService>(AccountsService);
    transactionsService = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transfer', () => {
    it('should transfer between two accounts', async () => {
      mockAccountsService.findOne
        .mockResolvedValueOnce(mockAccount(1, '100.00'))
        .mockResolvedValueOnce(mockAccount(2, '50.00'));
      mockTransactionsService.recordTransaction
        .mockResolvedValueOnce({ ...mockTransaction, id: 1 })
        .mockResolvedValueOnce({ ...mockTransaction, id: 2, accountId: 2 });

      const result = await service.transfer(1, 1, 2, '50.00');

      expect(result.fromTransaction).toBeDefined();
      expect(result.toTransaction).toBeDefined();
      expect(mockTransactionsService.recordTransaction).toHaveBeenCalledTimes(2);
    });

    it('should throw if insufficient funds', async () => {
      mockAccountsService.findOne
        .mockResolvedValueOnce(mockAccount(1, '30.00'))
        .mockResolvedValueOnce(mockAccount(2, '50.00'));

      await expect(service.transfer(1, 1, 2, '50.00')).rejects.toThrow(BadRequestException);
    });

    it('should throw if transferring to same account', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount(1, '100.00'));

      await expect(service.transfer(1, 1, 1, '50.00')).rejects.toThrow(BadRequestException);
    });

    it('should include description in transaction', async () => {
      mockAccountsService.findOne
        .mockResolvedValueOnce(mockAccount(1, '100.00'))
        .mockResolvedValueOnce(mockAccount(2, '50.00'));
      mockTransactionsService.recordTransaction
        .mockResolvedValueOnce({ ...mockTransaction, id: 1 })
        .mockResolvedValueOnce({ ...mockTransaction, id: 2, accountId: 2 });

      await service.transfer(1, 1, 2, '50.00', 'Rent payment');

      expect(mockTransactionsService.recordTransaction).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: 'Rent payment' }),
      );
    });
  });
});
