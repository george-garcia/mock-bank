import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsService } from '../accounts.service';
import { AccountsRepository } from '../accounts.repository';

describe('AccountsService', () => {
  let service: AccountsService;
  let repository: AccountsRepository;

  const mockAccount = {
    id: 1,
    userId: 1,
    type: 'checking' as const,
    name: 'Checking Account',
    balance: '100.00',
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      updateBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: AccountsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    repository = module.get(AccountsRepository);
  });

  describe('create', () => {
    it('should create an account with userId and default balance/status', async () => {
      jest.spyOn(repository, 'create').mockResolvedValue(mockAccount);

      const result = await service.create(1, { type: 'checking' });

      expect(repository.create).toHaveBeenCalledWith({
        userId: 1,
        type: 'checking',
        balance: '0.00',
        status: 'active',
      });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('findAllByUser', () => {
    it('should return accounts for a user', async () => {
      jest.spyOn(repository, 'findByUserId').mockResolvedValue([mockAccount]);

      const result = await service.findAllByUser(1);

      expect(repository.findByUserId).toHaveBeenCalledWith(1);
      expect(result).toEqual([mockAccount]);
    });
  });

  describe('findOne', () => {
    it('should return account if owned by user', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockAccount);

      const result = await service.findOne(1, 1);

      expect(repository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockAccount);
    });

    it('should throw NotFoundException if account does not exist', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if account belongs to another user', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue({ ...mockAccount, userId: 2 });

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateBalance', () => {
    it('should add amount to balance', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockAccount);
      jest.spyOn(repository, 'updateBalance').mockResolvedValue({
        ...mockAccount,
        balance: '150.00',
      });

      const result = await service.updateBalance(1, 1, '50.00');

      expect(repository.updateBalance).toHaveBeenCalledWith(1, '150.00');
      expect(result.balance).toBe('150.00');
    });

    it('should subtract amount from balance', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockAccount);
      jest.spyOn(repository, 'updateBalance').mockResolvedValue({
        ...mockAccount,
        balance: '50.00',
      });

      const result = await service.updateBalance(1, 1, '-50.00');

      expect(repository.updateBalance).toHaveBeenCalledWith(1, '50.00');
      expect(result.balance).toBe('50.00');
    });
  });
});
