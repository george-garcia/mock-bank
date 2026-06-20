import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, cards, cardTransactions, NewCard, NewCardTransaction } from '@mock-bank/database';

@Injectable()
export class CardsRepository {
  async create(data: NewCard) {
    const [card] = await db.insert(cards).values(data).returning();
    return card;
  }

  async findById(id: number) {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card || null;
  }

  async findByLithicToken(token: string) {
    const [card] = await db.select().from(cards).where(eq(cards.lithicCardToken, token));
    return card || null;
  }

  /** Look up a card by its full PAN — used by the Network/acquiring API to charge a card. */
  async findByPan(pan: string) {
    const [card] = await db.select().from(cards).where(eq(cards.cardNumber, pan));
    return card || null;
  }

  async findByAccountId(accountId: number) {
    return db.select().from(cards).where(eq(cards.accountId, accountId)).orderBy(desc(cards.createdAt));
  }

  async updateStatus(id: number, status: 'active' | 'frozen' | 'cancelled') {
    const [card] = await db
      .update(cards)
      .set({ status, updatedAt: new Date() })
      .where(eq(cards.id, id))
      .returning();
    return card;
  }

  // Card transactions
  async createCardTransaction(data: NewCardTransaction) {
    const [tx] = await db.insert(cardTransactions).values(data).returning();
    return tx;
  }

  async findCardTransactionById(id: number) {
    const [tx] = await db.select().from(cardTransactions).where(eq(cardTransactions.id, id));
    return tx || null;
  }

  async findCardTransactionByLithicToken(token: string) {
    const [tx] = await db.select().from(cardTransactions).where(eq(cardTransactions.lithicTransactionToken, token));
    return tx || null;
  }

  async findCardTransactionsByCardId(cardId: number) {
    return db
      .select()
      .from(cardTransactions)
      .where(eq(cardTransactions.cardId, cardId))
      .orderBy(desc(cardTransactions.createdAt));
  }

  async updateCardTransactionStatus(
    id: number,
    status: 'authorized' | 'declined' | 'settled' | 'voided',
    transactionId?: number,
  ) {
    const [tx] = await db
      .update(cardTransactions)
      .set({ status, ...(transactionId !== undefined ? { transactionId } : {}), updatedAt: new Date() })
      .where(eq(cardTransactions.id, id))
      .returning();
    return tx;
  }
}
