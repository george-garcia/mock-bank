import { Test, TestingModule } from '@nestjs/testing';
import { DepositsService } from '../deposits.service';
import { AccountsService } from '../../accounts/accounts.service';
import { TransactionsService } from '../../transactions/transactions.service';

describe('DepositsService', () => {
  let service: DepositsService;

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

  const mockAccountsService = {
    findOne: jest.fn(),
  };

  const mockTransactionsService = {
    recordTransaction: jest.fn(),
    createPendingTransaction: jest.fn(),
    completeTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    service = module.get<DepositsService>(DepositsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('simulateDeposit', () => {
    it('should create an instant deposit', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1, balance: '0.00' });
      mockTransactionsService.recordTransaction.mockResolvedValue(mockTransaction);

      const result = await service.simulateDeposit(1, {
        accountId: 1,
        amount: '100.00',
        instant: true,
      });

      expect(result.status).toBe('completed');
      expect(result.transaction).toEqual(mockTransaction);
      expect(mockTransactionsService.recordTransaction).toHaveBeenCalled();
    });

    it('should create a pending ACH deposit', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1, balance: '0.00' });
      mockTransactionsService.createPendingTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'pending' as const,
        description: 'ACH deposit from simulated',
      });

      const result = await service.simulateDeposit(1, {
        accountId: 1,
        amount: '100.00',
        instant: false,
      });

      expect(result.status).toBe('pending');
      expect(mockTransactionsService.createPendingTransaction).toHaveBeenCalled();
    });

    it('should verify account ownership before depositing', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsService.recordTransaction.mockResolvedValue(mockTransaction);

      await service.simulateDeposit(1, { accountId: 1, amount: '100.00', instant: true });

      expect(mockAccountsService.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('simulateDirectDeposit', () => {
    it('should create a direct deposit (pending)', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsService.createPendingTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'pending' as const,
        description: 'Direct deposit - Payroll',
      });

      const result = await service.simulateDirectDeposit(1, {
        accountId: 1,
        amount: '500.00',
      });

      expect(result.status).toBe('pending');
      expect(result.transaction.description).toBe('Direct deposit - Payroll');
    });
  });

  describe('simulatePayrollDeposit', () => {
    it('should create a payroll deposit (pending)', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockTransactionsService.createPendingTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'pending' as const,
        description: 'Payroll deposit',
      });

      const result = await service.simulatePayrollDeposit(1, 1, '2500.00');

      expect(result.status).toBe('pending');
      expect(result.transaction.description).toBe('Payroll deposit');
    });
  });
});
