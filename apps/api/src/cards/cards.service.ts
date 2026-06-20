import { Injectable, NotFoundException } from '@nestjs/common';
import { CardsRepository } from './cards.repository';
import { LithicService } from '../lithic/lithic.service';
import { LithicRepository } from '../lithic/lithic.repository';
import { AccountsService } from '../accounts/accounts.service';
import { AuditService } from '../audit/audit.service';
import { SpendLimitDuration } from '../lithic/lithic.types';

@Injectable()
export class CardsService {
  constructor(
    private cardsRepository: CardsRepository,
    private lithicService: LithicService,
    private lithicRepository: LithicRepository,
    private accountsService: AccountsService,
    private auditService: AuditService,
  ) {}

  async createCard(userId: number, accountId: number, data: { spendLimit?: string; spendLimitPeriod?: string; memo?: string }) {
    // Verify account ownership
    await this.accountsService.findOne(accountId, userId);

    // Issue the card at the Lithic processor.
    const lithicCard = this.lithicService.createCard({
      type: 'VIRTUAL',
      account_token: `account_${accountId}`,
      spend_limit: data.spendLimit ? Math.round(parseFloat(data.spendLimit) * 100) : undefined,
      spend_limit_duration: data.spendLimitPeriod as SpendLimitDuration | undefined,
      memo: data.memo,
    });

    // Persist our copy of the Lithic Card object.
    const card = await this.cardsRepository.create({
      accountId,
      lithicCardToken: lithicCard.token,
      type: lithicCard.type,
      lastFour: lithicCard.last_four,
      cardNumber: lithicCard.pan,
      cvv: lithicCard.cvv,
      expiryMonth: lithicCard.exp_month,
      expiryYear: lithicCard.exp_year,
      state: 'OPEN',
      spendLimit: data.spendLimit,
      spendLimitDuration: data.spendLimitPeriod as SpendLimitDuration | undefined,
      memo: data.memo,
    });

    return this.sanitize(card);
  }

  async findAllByUser(userId: number) {
    const userAccounts = await this.accountsService.findAllByUser(userId);
    const accountIds = userAccounts.map((a) => a.id);
    if (accountIds.length === 0) return [];

    const allCards: any[] = [];
    for (const accountId of accountIds) {
      const cards = await this.cardsRepository.findByAccountId(accountId);
      allCards.push(...cards);
    }
    return allCards.map((c) => this.sanitize(c));
  }

  async findOne(id: number, userId: number) {
    const card = await this.cardsRepository.findById(id);
    if (!card) throw new NotFoundException('Card not found');
    await this.accountsService.findOne(card.accountId, userId); // ownership check
    return this.sanitize(card);
  }

  /**
   * Reveal a card's sensitive details (full PAN + CVV) to its owner — the equivalent of a real
   * banking app's "show card number". The only path that returns the unsanitized PAN/CVV, so the
   * cardholder can use the card with an outside merchant. Owner-only, and audited.
   */
  async revealCard(id: number, userId: number) {
    const card = await this.cardsRepository.findById(id);
    if (!card) throw new NotFoundException('Card not found');
    await this.accountsService.findOne(card.accountId, userId); // ownership check

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

  /** The card's Lithic Transactions (with their events[]) — for the cardholder's history view. */
  async findCardTransactions(cardId: number, userId: number) {
    await this.findOne(cardId, userId); // ownership check
    const card = await this.cardsRepository.findById(cardId);
    const rows = await this.lithicRepository.findTransactionsByCardId(cardId);
    const events = await this.lithicRepository.eventsForTransactions(rows.map((r) => r.id));
    const byTxn = new Map<number, typeof events>();
    for (const e of events) {
      const list = byTxn.get(e.cardTransactionId) ?? [];
      list.push(e);
      byTxn.set(e.cardTransactionId, list);
    }
    return rows.map((r) => this.lithicService.toTransaction(r, byTxn.get(r.id) ?? [], card));
  }

  async freezeCard(id: number, userId: number) {
    const card = await this.findOne(id, userId);
    if (card.lithicCardToken) await this.lithicService.updateCardState(card.lithicCardToken, 'PAUSED');
    return this.cardsRepository.updateState(id, 'PAUSED');
  }

  async unfreezeCard(id: number, userId: number) {
    const card = await this.findOne(id, userId);
    if (card.lithicCardToken) await this.lithicService.updateCardState(card.lithicCardToken, 'OPEN');
    return this.cardsRepository.updateState(id, 'OPEN');
  }

  async cancelCard(id: number, userId: number) {
    const card = await this.findOne(id, userId);
    if (card.lithicCardToken) await this.lithicService.updateCardState(card.lithicCardToken, 'CLOSED');
    return this.cardsRepository.updateState(id, 'CLOSED');
  }

  /** Never expose the full PAN or CVV to clients — last four only (PCI). */
  private sanitize<T extends { cardNumber?: string | null; cvv?: string | null }>(card: T) {
    const { cardNumber, cvv, ...safe } = card;
    return safe;
  }
}
