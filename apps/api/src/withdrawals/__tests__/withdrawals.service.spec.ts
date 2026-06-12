import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalsService } from '../withdrawals.service';
import { AccountsService } from '../../accounts/accounts.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { BadRequestException } from '@nestjs/common';

describe('WithdrawalsService', () => {
  let service: WithdrawalsService;
  let accountsService: AccountsService;
  let transactionsService: TransactionsService;

  const mockAccount = (balance: string) => ({
    id: 1,
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
    type: 'withdrawal',
    amount: '50.00',
    balanceAfter: '50.00',
    description: 'Test withdrawal',
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
        WithdrawalsService,
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    service = module.get<WithdrawalsService>(WithdrawalsService);
    accountsService = module.get<AccountsService>(AccountsService);
    transactionsService = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('withdraw', () => {
    it('should process a withdrawal', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount('100.00'));
      mockTransactionsService.recordTransaction.mockResolvedValue(mockTransaction);

      const result = await service.withdraw(1, 1, '50.00');

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.status).toBe('completed');
    });

    it('should throw if insufficient funds', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount('30.00'));

      await expect(service.withdraw(1, 1, '50.00')).rejects.toThrow(BadRequestException);
    });

    it('should verify account ownership', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount('100.00'));
      mockTransactionsService.recordTransaction.mockResolvedValue(mockTransaction);

      await service.withdraw(1, 1, '50.00');

      expect(mockAccountsService.findOne).toHaveBeenCalledWith(1, 1);
    });

    it('should include custom description', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount('100.00'));
      mockTransactionsService.recordTransaction.mockResolvedValue(mockTransaction);

      await service.withdraw(1, 1, '50.00', 'ATM withdrawal');

      expect(mockTransactionsService.recordTransaction).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ description: 'ATM withdrawal' }),
      );
    });
  });

  describe('simulateACHWithdrawal', () => {
    it('should simulate an ACH withdrawal', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount('100.00'));
      mockTransactionsService.recordTransaction.mockResolvedValue(mockTransaction);

      const result = await service.simulateACHWithdrawal(1, 1, '50.00', '123456789', '987654321');

      expect(result.transaction).toEqual(mockTransaction);
    });
  });
});
