import { Test, TestingModule } from '@nestjs/testing';
import { CardsService } from '../cards.service';
import { CardsRepository } from '../cards.repository';
import { AccountsService } from '../../accounts/accounts.service';
import { LithicService } from '../../lithic/lithic.service';
import { AccountsRepository } from '../../accounts/accounts.repository';
import { NotFoundException } from '@nestjs/common';

describe('CardsService', () => {
  let service: CardsService;
  let cardsRepo: CardsRepository;

  const mockCard = {
    id: 1,
    accountId: 1,
    lithicCardToken: 'mock-card-1',
    lastFour: '1234',
    cardNumber: '4111111111111234',
    expiryMonth: '12',
    expiryYear: '2028',
    status: 'active',
    spendLimit: null,
    spendLimitPeriod: null,
    memo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCardsRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByAccountId: jest.fn(),
    findByLithicToken: jest.fn(),
    updateStatus: jest.fn(),
    createCardTransaction: jest.fn(),
    findCardTransactionsByCardId: jest.fn(),
    findCardTransactionByLithicToken: jest.fn(),
    updateCardTransactionStatus: jest.fn(),
  };

  const mockAccountsRepo = {
    findById: jest.fn(),
  };

  const mockAccountsService = {
    findOne: jest.fn(),
    findAllByUser: jest.fn(),
    updateBalance: jest.fn(),
  };

  const mockLithicService = {
    createCard: jest.fn(),
    getCard: jest.fn(),
    updateCardState: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        { provide: CardsRepository, useValue: mockCardsRepo },
        { provide: AccountsRepository, useValue: mockAccountsRepo },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: LithicService, useValue: mockLithicService },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
    cardsRepo = module.get<CardsRepository>(CardsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCard', () => {
    it('should create a virtual card', async () => {
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockLithicService.createCard.mockResolvedValue({
        token: 'mock-card-1',
        last_four: '1234',
        card_number: '4111111111111234',
        exp_month: '12',
        exp_year: '2028',
        state: 'OPEN',
      });
      mockCardsRepo.create.mockResolvedValue(mockCard);

      const result = await service.createCard(1, 1, { memo: 'Test card' });

      expect(result).toEqual(mockCard);
      expect(mockLithicService.createCard).toHaveBeenCalled();
    });

    it('should throw if account not found', async () => {
      mockAccountsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.createCard(1, 999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByUser', () => {
    it('should return cards for user', async () => {
      mockAccountsService.findAllByUser.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockCardsRepo.findByAccountId.mockResolvedValue([mockCard]);

      const result = await service.findAllByUser(1);

      expect(result).toEqual([mockCard, mockCard]);
    });

    it('should return empty array if no accounts', async () => {
      mockAccountsService.findAllByUser.mockResolvedValue([]);

      const result = await service.findAllByUser(1);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a card by id', async () => {
      mockCardsRepo.findById.mockResolvedValue(mockCard);
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });

      const result = await service.findOne(1, 1);

      expect(result).toEqual(mockCard);
    });

    it('should throw if card not found', async () => {
      mockCardsRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('freezeCard', () => {
    it('should freeze an active card', async () => {
      mockCardsRepo.findById.mockResolvedValue(mockCard);
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockLithicService.updateCardState.mockResolvedValue({ ...mockCard, state: 'PAUSED' });
      mockCardsRepo.updateStatus.mockResolvedValue({ ...mockCard, status: 'frozen' });

      const result = await service.freezeCard(1, 1);

      expect(result.status).toBe('frozen');
    });
  });

  describe('unfreezeCard', () => {
    it('should unfreeze a frozen card', async () => {
      mockCardsRepo.findById.mockResolvedValue({ ...mockCard, status: 'frozen' });
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockLithicService.updateCardState.mockResolvedValue({ ...mockCard, state: 'OPEN' });
      mockCardsRepo.updateStatus.mockResolvedValue({ ...mockCard, status: 'active' });

      const result = await service.unfreezeCard(1, 1);

      expect(result.status).toBe('active');
    });
  });

  describe('cancelCard', () => {
    it('should cancel a card', async () => {
      mockCardsRepo.findById.mockResolvedValue(mockCard);
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });
      mockLithicService.updateCardState.mockResolvedValue({ ...mockCard, state: 'CLOSED' });
      mockCardsRepo.updateStatus.mockResolvedValue({ ...mockCard, status: 'cancelled' });

      const result = await service.cancelCard(1, 1);

      expect(result.status).toBe('cancelled');
    });
  });
});
