import { Test, TestingModule } from '@nestjs/testing';
import { CardsService } from '../cards.service';
import { CardsRepository } from '../cards.repository';
import { AccountsService } from '../../accounts/accounts.service';
import { LithicService } from '../../lithic/lithic.service';
import { AuditService } from '../../audit/audit.service';
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

  const mockAccountsService = {
    findOne: jest.fn(),
    findAllByUser: jest.fn(),
    findByIdInternal: jest.fn(),
    updateBalance: jest.fn(),
  };

  const mockLithicService = {
    createCard: jest.fn(),
    getCard: jest.fn(),
    updateCardState: jest.fn(),
  };

  const mockAuditService = {
    record: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        { provide: CardsRepository, useValue: mockCardsRepo },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: LithicService, useValue: mockLithicService },
        { provide: AuditService, useValue: mockAuditService },
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

      expect(result).not.toHaveProperty('cardNumber'); // PCI: full PAN never returned
      expect(result).toMatchObject({ id: 1, lastFour: '1234' });
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

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('cardNumber');
      expect(result[0]).toMatchObject({ id: 1, lastFour: '1234' });
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

      expect(result).not.toHaveProperty('cardNumber');
      expect(result).toMatchObject({ id: 1, lastFour: '1234' });
    });

    it('should throw if card not found', async () => {
      mockCardsRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('revealCard', () => {
    it('returns the full PAN and CVV to the owner', async () => {
      mockCardsRepo.findById.mockResolvedValue({ ...mockCard, cvv: '321' });
      mockAccountsService.findOne.mockResolvedValue({ id: 1, userId: 1 });

      const result = await service.revealCard(1, 1);

      expect(result).toMatchObject({ id: 1, cardNumber: '4111111111111234', cvv: '321', lastFour: '1234' });
      expect(mockAuditService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'card.reveal' }));
    });

    it('throws if the card is not found', async () => {
      mockCardsRepo.findById.mockResolvedValue(null);
      await expect(service.revealCard(999, 1)).rejects.toThrow(NotFoundException);
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
