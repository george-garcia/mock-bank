import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { db, cards, NewCard } from '@mock-bank/database';

type CardState = 'OPEN' | 'PAUSED' | 'CLOSED' | 'PENDING_ACTIVATION' | 'PENDING_FULFILLMENT';

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

  /** Update the Lithic card state (OPEN / PAUSED / CLOSED). */
  async updateState(id: number, state: CardState) {
    const [card] = await db
      .update(cards)
      .set({ state, updatedAt: new Date() })
      .where(eq(cards.id, id))
      .returning();
    return card;
  }
}
