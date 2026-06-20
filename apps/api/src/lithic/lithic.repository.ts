import { Injectable } from '@nestjs/common';
import { eq, desc, inArray, asc } from 'drizzle-orm';
import {
  db, cards, cardTransactions, cardTransactionEvents, payments, paymentEvents,
  NewCardTransaction, NewCardTransactionEvent, NewPayment, NewPaymentEvent,
} from '@mock-bank/database';

/**
 * Persistence for the Lithic processor objects: Transactions + their events[], and ACH Payments
 * + their events[]. Also reads the `cards` table (the processor looks cards up by PAN/token).
 * Kept separate from CardsRepository so the Lithic module does not depend on the Cards module.
 */
@Injectable()
export class LithicRepository {
  // ── Cards (reads only — issuance is done by CardsRepository) ──
  async findCardByPan(pan: string) {
    const [c] = await db.select().from(cards).where(eq(cards.cardNumber, pan));
    return c ?? null;
  }
  async findCardByToken(token: string) {
    const [c] = await db.select().from(cards).where(eq(cards.lithicCardToken, token));
    return c ?? null;
  }
  async findCardById(id: number) {
    const [c] = await db.select().from(cards).where(eq(cards.id, id));
    return c ?? null;
  }

  // ── Card transactions (Lithic Transaction object) ──
  async createTransaction(values: NewCardTransaction) {
    const [t] = await db.insert(cardTransactions).values(values).returning();
    return t;
  }
  async addTransactionEvent(values: NewCardTransactionEvent) {
    const [e] = await db.insert(cardTransactionEvents).values(values).returning();
    return e;
  }
  async findTransactionByToken(token: string) {
    const [t] = await db.select().from(cardTransactions).where(eq(cardTransactions.token, token));
    return t ?? null;
  }
  async findTransactionById(id: number) {
    const [t] = await db.select().from(cardTransactions).where(eq(cardTransactions.id, id));
    return t ?? null;
  }
  async updateTransaction(id: number, patch: Partial<NewCardTransaction>) {
    const [t] = await db
      .update(cardTransactions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(cardTransactions.id, id))
      .returning();
    return t;
  }
  async findTransactionsByCardId(cardId: number) {
    return db.select().from(cardTransactions).where(eq(cardTransactions.cardId, cardId)).orderBy(desc(cardTransactions.createdAt));
  }
  async eventsForTransactions(ids: number[]) {
    if (ids.length === 0) return [];
    return db
      .select()
      .from(cardTransactionEvents)
      .where(inArray(cardTransactionEvents.cardTransactionId, ids))
      .orderBy(asc(cardTransactionEvents.created));
  }

  // ── ACH Payments (Lithic Payment object) ──
  async createPayment(values: NewPayment) {
    const [p] = await db.insert(payments).values(values).returning();
    return p;
  }
  async addPaymentEvent(values: NewPaymentEvent) {
    const [e] = await db.insert(paymentEvents).values(values).returning();
    return e;
  }
  async findPaymentByToken(token: string) {
    const [p] = await db.select().from(payments).where(eq(payments.token, token));
    return p ?? null;
  }
  async eventsForPayment(paymentId: number) {
    return db.select().from(paymentEvents).where(eq(paymentEvents.paymentId, paymentId)).orderBy(asc(paymentEvents.created));
  }
  async findPaymentByIdempotencyKey(key: string) {
    const [p] = await db.select().from(payments).where(eq(payments.idempotencyKey, key));
    return p ?? null;
  }
  async updatePayment(id: number, patch: Partial<NewPayment>) {
    const [p] = await db.update(payments).set({ ...patch, updatedAt: new Date() }).where(eq(payments.id, id)).returning();
    return p;
  }
}
