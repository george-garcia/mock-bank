import { Test, TestingModule } from '@nestjs/testing';
import { LithicService } from '../lithic.service';
import { LithicRepository } from '../lithic.repository';
import { AsaService } from '../asa.service';
import { LithicWebhookService } from '../lithic-webhook.service';

const openCard = { id: 1, accountId: 1, lithicCardToken: 'card_x', state: 'OPEN', expiryMonth: '12', expiryYear: '2030', cvv: '123', createdAt: new Date() };

describe('LithicService (processor)', () => {
  let service: LithicService;

  const repo = {
    findCardByPan: jest.fn(),
    findCardById: jest.fn(),
    createTransaction: jest.fn(),
    addTransactionEvent: jest.fn(),
    eventsForTransactions: jest.fn(),
  };
  const asa = { decide: jest.fn() };
  const webhook = { processEvent: jest.fn() };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LithicService,
        { provide: LithicRepository, useValue: repo },
        { provide: AsaService, useValue: asa },
        { provide: LithicWebhookService, useValue: webhook },
      ],
    }).compile();
    service = moduleRef.get(LithicService);

    jest.clearAllMocks();
    repo.findCardById.mockResolvedValue(openCard);
    repo.eventsForTransactions.mockResolvedValue([]);
    repo.addTransactionEvent.mockImplementation((v: any) => Promise.resolve({ ...v, created: new Date() }));
    webhook.processEvent.mockResolvedValue({ received: true });
  });

  it('issues a Lithic-shaped card', () => {
    const card = service.createCard({ type: 'VIRTUAL', account_token: 'account_1', spend_limit: 500, spend_limit_duration: 'MONTHLY' });
    expect(card.token).toMatch(/^card_/);
    expect(card.last_four).toHaveLength(4);
    expect(card.state).toBe('OPEN');
    expect(card.spend_limit).toBe(500);
    expect(card.spend_limit_duration).toBe('MONTHLY');
  });

  it('declines an unknown PAN with card_not_found and persists nothing', async () => {
    repo.findCardByPan.mockResolvedValue(null);
    const res = await service.authorizeTransaction({ pan: '4111111111111111', expMonth: '12', expYear: '2030', cvv: '123', amount: 5000, merchant: { descriptor: 'Lucky Spin' } });
    expect(res.transaction).toBeNull();
    expect(res.declineReason).toBe('card_not_found');
    expect(repo.createTransaction).not.toHaveBeenCalled();
  });

  it('declines invalid CVV at the processor (before ASA)', async () => {
    repo.findCardByPan.mockResolvedValue(openCard);
    repo.createTransaction.mockResolvedValue({ id: 9, token: 'txn_a', cardId: 1, amount: 5000, status: 'DECLINED', result: 'DECLINED', createdAt: new Date() });
    const res = await service.authorizeTransaction({ pan: '4111111111111111', expMonth: '12', expYear: '2030', cvv: '999', amount: 5000, merchant: { descriptor: 'Lucky Spin' } });
    expect(res.declineReason).toBe('invalid_cvv');
    expect(asa.decide).not.toHaveBeenCalled();
  });

  it('approves via ASA and emits a transaction.created webhook', async () => {
    repo.findCardByPan.mockResolvedValue(openCard);
    asa.decide.mockResolvedValue({ approved: true, result: 'APPROVED' });
    repo.createTransaction.mockResolvedValue({ id: 10, token: 'txn_b', cardId: 1, amount: 5000, authorizationAmount: 5000, authorizationCode: '123456', status: 'PENDING', result: 'APPROVED', createdAt: new Date() });

    const res = await service.authorizeTransaction({ pan: '4111111111111111', expMonth: '12', expYear: '2030', cvv: '123', amount: 5000, merchant: { descriptor: 'Lucky Spin' } });

    expect(res.transaction?.result).toBe('APPROVED');
    expect(asa.decide).toHaveBeenCalled();
    expect(repo.addTransactionEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'AUTHORIZATION', result: 'APPROVED' }));
    expect(webhook.processEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'transaction.created' }));
  });

  it('declines with insufficient_funds when ASA declines', async () => {
    repo.findCardByPan.mockResolvedValue(openCard);
    asa.decide.mockResolvedValue({ approved: false, result: 'INSUFFICIENT_FUNDS' });
    repo.createTransaction.mockResolvedValue({ id: 11, token: 'txn_c', cardId: 1, amount: 5000, status: 'DECLINED', result: 'DECLINED', createdAt: new Date() });

    const res = await service.authorizeTransaction({ pan: '4111111111111111', expMonth: '12', expYear: '2030', cvv: '123', amount: 5000, merchant: { descriptor: 'Lucky Spin' } });

    expect(res.declineReason).toBe('insufficient_funds');
    expect(repo.addTransactionEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'AUTHORIZATION', result: 'INSUFFICIENT_FUNDS' }));
  });
});
