import { Test, TestingModule } from '@nestjs/testing';
import { LithicService } from '../lithic.service';
import { ConfigService } from '@nestjs/config';

describe('LithicService', () => {
  let service: LithicService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const values: Record<string, any> = {
        LITHIC_API_KEY: '',
        LITHIC_BASE_URL: 'https://sandbox.lithic.com/v1',
      };
      return values[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LithicService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LithicService>(LithicService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mock mode', () => {
    it('should create a mock card', async () => {
      const card = await service.createCard({ type: 'VIRTUAL' });

      expect(card.token).toMatch(/^mock-card-/);
      expect(card.last_four).toHaveLength(4);
      expect(card.state).toBe('OPEN');
    });

    it('should retrieve a mock card', async () => {
      const created = await service.createCard({ type: 'VIRTUAL' });
      const retrieved = await service.getCard(created.token);

      expect(retrieved.token).toBe(created.token);
      expect(retrieved.last_four).toBe(created.last_four);
    });

    it('should list mock cards', async () => {
      await service.createCard({ type: 'VIRTUAL' });
      await service.createCard({ type: 'VIRTUAL' });

      const list = await service.listCards();

      expect(list.data).toHaveLength(2);
    });

    it('should update card state', async () => {
      const created = await service.createCard({ type: 'VIRTUAL' });
      const updated = await service.updateCardState(created.token, 'PAUSED');

      expect(updated.state).toBe('PAUSED');
    });

    it('should throw when getting non-existent card', async () => {
      await expect(service.getCard('non-existent')).rejects.toThrow('Card not found');
    });

    it('should support spend limits', async () => {
      const card = await service.createCard({
        type: 'VIRTUAL',
        spend_limit: 500,
        spend_limit_duration: 'MONTHLY',
      });

      expect(card.spend_limit).toBe(500);
      expect(card.spend_limit_duration).toBe('MONTHLY');
    });
  });

  describe('real API mode', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          LITHIC_API_KEY: 'real-api-key',
          LITHIC_BASE_URL: 'https://api.lithic.com/v1',
        };
        return values[key] ?? defaultValue;
      });
    });

    it('should be configured for real API when key is present', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LithicService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const realService = module.get<LithicService>(LithicService);
      expect(realService).toBeDefined();
    });
  });
});
