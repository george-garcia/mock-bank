import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CardsRepository } from './cards.repository';
import { LithicService } from '../lithic/lithic.service';
import { AccountsService } from '../accounts/accounts.service';
import { AuditService } from '../audit/audit.service';
import { NewCard, NewCardTransaction } from '@mock-bank/database';

@Injectable()
export class CardsService {
  constructor(
    private cardsRepository: CardsRepository,
    private lithicService: LithicService,
    private accountsService: AccountsService,
    private auditService: AuditService,
  ) {}

  async createCard(userId: number, accountId: number, data: { spendLimit?: string; spendLimitPeriod?: string; memo?: string }) {
    // Verify account ownership
    const account = await this.accountsService.findOne(accountId, userId);

    // Create card in Lithic
    const lithicCard = await this.lithicService.createCard({
      type: 'VIRTUAL',
      spend_limit: data.spendLimit ? parseFloat(data.spendLimit) : undefined,
      spend_limit_duration: data.spendLimitPeriod as any,
      memo: data.memo,
    });

    // Store in our DB
    const card = await this.cardsRepository.create({
      accountId,
      lithicCardToken: lithicCard.token,
      lastFour: lithicCard.last_four,
      cardNumber: lithicCard.card_number,
      cvv: lithicCard.cvv,
      expiryMonth: lithicCard.exp_month,
      expiryYear: lithicCard.exp_year,
      status: 'active',
      spendLimit: data.spendLimit,
      spendLimitPeriod: data.spendLimitPeriod,
    });

    return this.sanitize(card);
  }

  async findAllByUser(userId: number) {
    // Get all accounts for user, then all cards for those accounts
    const userAccounts = await this.accountsService.findAllByUser(userId);
    const accountIds = userAccounts.map(a => a.id);

    if (accountIds.length === 0) return [];

    // Get cards for all user accounts
    const allCards: any[] = [];
    for (const accountId of accountIds) {
      const cards = await this.cardsRepository.findByAccountId(accountId);
      allCards.push(...cards);
    }
    return allCards.map((c) => this.sanitize(c));
  }

  async findOne(id: number, userId: number) {
    const card = await this.cardsRepository.findById(id);
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    // Verify ownership via account
    await this.accountsService.findOne(card.accountId, userId);
    return this.sanitize(card);
  }

  /**
   * Reveal a card's sensitive details (full PAN + CVV) to its owner — the equivalent of a real
   * banking app's "show card number". This is the only path that returns the unsanitized PAN/CVV,
   * so the cardholder can use the card with an outside merchant. Owner-only, and audited.
   */
  async revealCard(id: number, userId: number) {
    const card = await this.cardsRepository.findById(id);
    if (!card) throw new NotFoundException('Card not found');
    await this.accountsService.findOne(card.accountId, userId); // ownership check (throws otherwise)

    await this.auditService.record({
      actorType: 'customer',
      actorUserId: userId,
      action: 'card.reveal',
      targetType: 'card',
      targetId: card.id,
    });

    return {
      id: card.id,
      cardNumber: card.cardNumber,
      cvv: card.cvv,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      lastFour: card.lastFour,
    };
  }

  /** Never expose the full PAN or CVV to clients — last four only (PCI). */
  private sanitize<T extends { cardNumber?: string | null; cvv?: string | null }>(card: T) {
    const { cardNumber, cvv, ...safe } = card;
    return safe;
  }

  async findByLithicToken(token: string) {
    return this.cardsRepository.findByLithicToken(token);
  }

  /** Internal: find a card by its full PAN (used by the Network/acquiring API). Not sanitized. */
  async findByPanInternal(pan: string) {
    return this.cardsRepository.findByPan(pan);
  }

  /** Internal: fetch the raw card row (with accountId) by id. Not sanitized. */
  async findCardByIdInternal(id: number) {
    return this.cardsRepository.findById(id);
  }

  async getAccountForCard(cardId: number) {
    const card = await this.cardsRepository.findById(cardId);
    if (!card) throw new NotFoundException('Card not found');
    return this.accountsService.findByIdInternal(card.accountId);
  }

  async freezeCard(id: number, userId: number) {
    const card = await this.findOne(id, userId);
    if (card.lithicCardToken) {
      await this.lithicService.updateCardState(card.lithicCardToken, 'PAUSED');
    }
    return this.cardsRepository.updateStatus(id, 'frozen');
  }

  async unfreezeCard(id: number, userId: number) {
    const card = await this.findOne(id, userId);
    if (card.lithicCardToken) {
      await this.lithicService.updateCardState(card.lithicCardToken, 'OPEN');
    }
    return this.cardsRepository.updateStatus(id, 'active');
  }

  async cancelCard(id: number, userId: number) {
    const card = await this.findOne(id, userId);
    if (card.lithicCardToken) {
      await this.lithicService.updateCardState(card.lithicCardToken, 'CLOSED');
    }
    return this.cardsRepository.updateStatus(id, 'cancelled');
  }

  // Card transaction helpers
  async recordCardTransaction(cardId: number, data: Omit<NewCardTransaction, 'cardId'>) {
    return this.cardsRepository.createCardTransaction({
      ...data,
      cardId,
    });
  }

  async findCardTransactionByLithicToken(token: string) {
    return this.cardsRepository.findCardTransactionByLithicToken(token);
  }

  async findCardTransactions(cardId: number, userId: number) {
    await this.findOne(cardId, userId); // Verify ownership
    return this.cardsRepository.findCardTransactionsByCardId(cardId);
  }

  async settleCardTransaction(id: number, ledgerTransactionId: number) {
    return this.cardsRepository.updateCardTransactionStatus(id, 'settled', ledgerTransactionId);
  }

  async voidCardTransaction(id: number) {
    return this.cardsRepository.updateCardTransactionStatus(id, 'voided');
  }
}
