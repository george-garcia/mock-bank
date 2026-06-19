import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, inArray, desc, asc, and, sum, lt, gte, isNotNull } from 'drizzle-orm';
import {
  db,
  accounts,
  ledgerAccounts,
  ledgerTransactions,
  ledgerEntries,
  holds,
  LedgerAccount,
  Hold,
} from '@mock-bank/database';

export type LedgerSide = 'debit' | 'credit';
export type LedgerTxnType =
  | 'deposit' | 'withdrawal' | 'transfer' | 'card_settlement'
  | 'card_auth' | 'reversal' | 'refund' | 'fee' | 'adjustment';

export interface PostEntry {
  ledgerAccountId: number;
  direction: LedgerSide;
  amountMinor: number;
}

export interface PostInput {
  idempotencyKey: string;
  type: LedgerTxnType;
  description?: string;
  metadata?: Record<string, unknown>;
  entries: PostEntry[];
  /** Allow a customer account to go negative (e.g. a forced card settlement). */
  allowNegative?: boolean;
  /** Set when this journal reverses another (the original's id). */
  reversalOfId?: number;
}

@Injectable()
export class LedgerRepository {
  async customerLedgerAccountId(accountId: number): Promise<number | null> {
    const [la] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.accountId, accountId));
    return la?.id ?? null;
  }

  async systemLedgerAccountId(kind: string): Promise<number> {
    const [la] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.systemKind, kind));
    if (!la) throw new Error(`Missing internal GL account: "${kind}". Did the seed run?`);
    return la.id;
  }

  async createCustomerLedgerAccount(accountId: number, name: string): Promise<LedgerAccount> {
    const [la] = await db
      .insert(ledgerAccounts)
      .values({ accountId, name, category: 'liability', normalSide: 'credit', balanceMinor: 0 })
      .returning();
    return la;
  }

  async balanceMinorForAccount(accountId: number): Promise<number> {
    const [la] = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.accountId, accountId));
    return la?.balanceMinor ?? 0;
  }

  async balancesForAccounts(accountIds: number[]): Promise<Map<number, number>> {
    if (accountIds.length === 0) return new Map();
    const rows = await db.select().from(ledgerAccounts).where(inArray(ledgerAccounts.accountId, accountIds));
    return new Map(rows.filter((r) => r.accountId !== null).map((r) => [r.accountId as number, r.balanceMinor]));
  }

  /** accountId → active hold total (minor units). */
  async activeHoldsForAccounts(accountIds: number[]): Promise<Map<number, number>> {
    if (accountIds.length === 0) return new Map();
    const rows = await db
      .select({ accountId: ledgerAccounts.accountId, total: sum(holds.amountMinor) })
      .from(holds)
      .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, holds.ledgerAccountId))
      .where(and(inArray(ledgerAccounts.accountId, accountIds), eq(holds.status, 'active')))
      .groupBy(ledgerAccounts.accountId);
    return new Map(rows.filter((r) => r.accountId !== null).map((r) => [r.accountId as number, Number(r.total ?? 0)]));
  }

  /**
   * Place a hold against a customer account, reducing its available balance atomically.
   * Idempotent on externalRef. Rejects if available funds are insufficient.
   */
  async placeHold(input: {
    ledgerAccountId: number;
    amountMinor: number;
    type: 'card_auth' | 'manual';
    externalRef?: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<Hold> {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new BadRequestException('Hold amount must be a positive integer (minor units)');
    }
    return db.transaction(async (tx) => {
      const [acct] = await tx
        .select()
        .from(ledgerAccounts)
        .where(eq(ledgerAccounts.id, input.ledgerAccountId))
        .for('update');
      if (!acct) throw new BadRequestException('Unknown ledger account');

      // A frozen or closed account cannot authorize new holds.
      if (acct.accountId !== null) {
        const [a] = await tx.select({ status: accounts.status }).from(accounts).where(eq(accounts.id, acct.accountId));
        if (a?.status === 'closed') throw new BadRequestException('Account is closed');
        if (a?.status === 'frozen') throw new BadRequestException('Account is frozen');
      }

      const [{ total }] = await tx
        .select({ total: sum(holds.amountMinor) })
        .from(holds)
        .where(and(eq(holds.ledgerAccountId, input.ledgerAccountId), eq(holds.status, 'active')));
      const available = acct.balanceMinor - Number(total ?? 0);
      if (available < input.amountMinor) {
        throw new BadRequestException('Insufficient funds');
      }

      const inserted = await tx
        .insert(holds)
        .values({
          ledgerAccountId: input.ledgerAccountId,
          amountMinor: input.amountMinor,
          type: input.type,
          externalRef: input.externalRef,
          expiresAt: input.expiresAt,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          status: 'active',
        })
        .onConflictDoNothing({ target: holds.externalRef })
        .returning();

      if (inserted.length === 0 && input.externalRef) {
        const [existing] = await tx.select().from(holds).where(eq(holds.externalRef, input.externalRef));
        return existing;
      }
      return inserted[0];
    });
  }

  /** Resolve an active hold (release/capture/expire). Idempotent: a no-op if already resolved. */
  async resolveHold(externalRef: string, status: 'released' | 'captured' | 'expired'): Promise<Hold | null> {
    const [hold] = await db
      .update(holds)
      .set({ status, releasedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(holds.externalRef, externalRef), eq(holds.status, 'active')))
      .returning();
    return hold ?? null;
  }

  async historyForAccount(accountId: number) {
    const laId = await this.customerLedgerAccountId(accountId);
    if (!laId) return [];
    return db
      .select({
        id: ledgerEntries.id,
        direction: ledgerEntries.direction,
        amountMinor: ledgerEntries.amountMinor,
        createdAt: ledgerEntries.createdAt,
        transactionId: ledgerTransactions.id,
        type: ledgerTransactions.type,
        status: ledgerTransactions.status,
        description: ledgerTransactions.description,
      })
      .from(ledgerEntries)
      .innerJoin(ledgerTransactions, eq(ledgerEntries.transactionId, ledgerTransactions.id))
      .where(eq(ledgerEntries.ledgerAccountId, laId))
      .orderBy(desc(ledgerEntries.createdAt));
  }

  /** Signed balance (credit − debit) of a ledger account from all entries before `before`. */
  async signedSumBefore(ledgerAccountId: number, before: Date): Promise<number> {
    const [row] = await db
      .select({
        credit: sum(/* credit */ ledgerEntries.amountMinor),
      })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.ledgerAccountId, ledgerAccountId), lt(ledgerEntries.createdAt, before), eq(ledgerEntries.direction, 'credit')));
    const [debitRow] = await db
      .select({ debit: sum(ledgerEntries.amountMinor) })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.ledgerAccountId, ledgerAccountId), lt(ledgerEntries.createdAt, before), eq(ledgerEntries.direction, 'debit')));
    return Number(row?.credit ?? 0) - Number(debitRow?.debit ?? 0);
  }

  /** Entries (with journal info) for a ledger account in [start, end), oldest first. */
  async entriesBetween(ledgerAccountId: number, start: Date, end: Date) {
    return db
      .select({
        id: ledgerEntries.id,
        direction: ledgerEntries.direction,
        amountMinor: ledgerEntries.amountMinor,
        createdAt: ledgerEntries.createdAt,
        transactionId: ledgerTransactions.id,
        type: ledgerTransactions.type,
        status: ledgerTransactions.status,
        description: ledgerTransactions.description,
      })
      .from(ledgerEntries)
      .innerJoin(ledgerTransactions, eq(ledgerEntries.transactionId, ledgerTransactions.id))
      .where(and(eq(ledgerEntries.ledgerAccountId, ledgerAccountId), gte(ledgerEntries.createdAt, start), lt(ledgerEntries.createdAt, end)))
      .orderBy(asc(ledgerEntries.createdAt));
  }

  /**
   * Post a balanced set of entries atomically: one DB transaction, customer rows locked
   * FOR UPDATE, idempotent on idempotencyKey, with cached balances updated in the same
   * transaction. Throws (and rolls back) on imbalance, unknown account, or overdraft.
   */
  async post(input: PostInput) {
    this.validate(input);
    return db.transaction(async (tx) => this.applyJournal(tx, input));
  }

  /**
   * Reverse a posted journal with a new, offsetting journal (entries mirrored). The original
   * is never edited — it is marked 'reversed'. Idempotent: a second call returns the existing
   * reversal. Reversals are forced posts (may push an account negative).
   */
  async reverse(originalTxnId: number, reason?: string) {
    return db.transaction(async (tx) => {
      const [orig] = await tx.select().from(ledgerTransactions).where(eq(ledgerTransactions.id, originalTxnId));
      if (!orig) throw new NotFoundException('Transaction not found');

      if (orig.status === 'reversed') {
        const [rev] = await tx.select().from(ledgerTransactions).where(eq(ledgerTransactions.reversalOfId, originalTxnId));
        const entries = rev ? await tx.select().from(ledgerEntries).where(eq(ledgerEntries.transactionId, rev.id)) : [];
        return { transaction: rev ?? orig, entries, idempotentReplay: true };
      }

      const origEntries = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.transactionId, originalTxnId));
      const mirror: PostEntry[] = origEntries.map((e) => ({
        ledgerAccountId: e.ledgerAccountId,
        direction: e.direction === 'debit' ? 'credit' : 'debit',
        amountMinor: e.amountMinor,
      }));

      const result = await this.applyJournal(tx, {
        idempotencyKey: `reversal:${originalTxnId}`,
        type: 'reversal',
        reversalOfId: originalTxnId,
        description: reason ?? `Reversal of transaction ${originalTxnId}`,
        entries: mirror,
        allowNegative: true,
      });

      await tx.update(ledgerTransactions).set({ status: 'reversed' }).where(eq(ledgerTransactions.id, originalTxnId));
      return result;
    });
  }

  /** Expire active holds past their expiry, freeing the reserved funds. Returns the count. */
  async expireHolds(now: Date): Promise<number> {
    const expired = await db
      .update(holds)
      .set({ status: 'expired', releasedAt: now, updatedAt: now })
      .where(and(eq(holds.status, 'active'), isNotNull(holds.expiresAt), lt(holds.expiresAt, now)))
      .returning();
    return expired.length;
  }

  private async applyJournal(tx: any, input: PostInput) {
      // Idempotency: insert the journal header; if the key already exists, this is a retry —
      // return the prior result without re-applying any entries.
      const inserted = await tx
        .insert(ledgerTransactions)
        .values({
          idempotencyKey: input.idempotencyKey,
          type: input.type,
          status: 'posted',
          description: input.description,
          reversalOfId: input.reversalOfId,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        })
        .onConflictDoNothing({ target: ledgerTransactions.idempotencyKey })
        .returning();

      if (inserted.length === 0) {
        const [existing] = await tx
          .select()
          .from(ledgerTransactions)
          .where(eq(ledgerTransactions.idempotencyKey, input.idempotencyKey));
        const entries = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.transactionId, existing.id));
        return { transaction: existing, entries, idempotentReplay: true };
      }

      const journal = inserted[0];
      const accountIds = [...new Set(input.entries.map((e) => e.ledgerAccountId))].sort((a, b) => a - b);

      // Lock affected ledger accounts (sorted id order to avoid deadlocks).
      const locked = await tx
        .select()
        .from(ledgerAccounts)
        .where(inArray(ledgerAccounts.id, accountIds))
        .for('update');
      if (locked.length !== accountIds.length) {
        throw new BadRequestException('Unknown ledger account in journal');
      }
      const byId = new Map<number, LedgerAccount>((locked as LedgerAccount[]).map((a) => [a.id, a]));

      // Account-status enforcement: a closed account blocks all activity; a frozen account
      // blocks debits (money out) but still accepts credits (e.g. refunds, reversals).
      const customerAccountIds = [...byId.values()].filter((a) => a.accountId !== null).map((a) => a.accountId as number);
      if (customerAccountIds.length > 0) {
        const acctRows = await tx.select({ id: accounts.id, status: accounts.status }).from(accounts).where(inArray(accounts.id, customerAccountIds));
        const statusByAccountId = new Map(acctRows.map((r) => [r.id, r.status]));
        for (const e of input.entries) {
          const la = byId.get(e.ledgerAccountId)!;
          if (la.accountId === null) continue;
          const status = statusByAccountId.get(la.accountId);
          if (status === 'closed') throw new BadRequestException('Account is closed');
          if (status === 'frozen' && e.direction === 'debit') throw new BadRequestException('Account is frozen');
        }
      }

      // Compute resulting balances (entry in the account's normal side increases it).
      const newBalances = new Map<number, number>(accountIds.map((id) => [id, byId.get(id)!.balanceMinor]));
      for (const e of input.entries) {
        const acct = byId.get(e.ledgerAccountId)!;
        const delta = e.direction === acct.normalSide ? e.amountMinor : -e.amountMinor;
        newBalances.set(e.ledgerAccountId, newBalances.get(e.ledgerAccountId)! + delta);
      }

      // Overdraft guard: a customer account's *available* balance (posted − active holds)
      // must not go negative.
      if (!input.allowNegative) {
        const holdRows = await tx
          .select({ id: holds.ledgerAccountId, total: sum(holds.amountMinor) })
          .from(holds)
          .where(and(inArray(holds.ledgerAccountId, accountIds), eq(holds.status, 'active')))
          .groupBy(holds.ledgerAccountId);
        const activeHolds = new Map<number, number>(holdRows.map((r) => [r.id, Number(r.total ?? 0)]));

        for (const id of accountIds) {
          const acct = byId.get(id)!;
          if (acct.accountId !== null && acct.category === 'liability') {
            const available = newBalances.get(id)! - (activeHolds.get(id) ?? 0);
            if (available < 0) {
              throw new BadRequestException('Insufficient funds');
            }
          }
        }
      }

      // Append immutable entries.
      await tx.insert(ledgerEntries).values(
        input.entries.map((e) => ({
          transactionId: journal.id,
          ledgerAccountId: e.ledgerAccountId,
          direction: e.direction,
          amountMinor: e.amountMinor,
        })),
      );

      // Update cached balances within the same transaction.
      for (const id of accountIds) {
        await tx
          .update(ledgerAccounts)
          .set({ balanceMinor: newBalances.get(id)!, updatedAt: new Date() })
          .where(eq(ledgerAccounts.id, id));
      }

      const entries = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.transactionId, journal.id));
      return { transaction: journal, entries, idempotentReplay: false };
  }

  private validate(input: PostInput) {
    if (!input.idempotencyKey) throw new BadRequestException('idempotencyKey is required');
    if (!input.entries || input.entries.length < 2) {
      throw new BadRequestException('A journal needs at least two entries');
    }
    let debit = 0;
    let credit = 0;
    for (const e of input.entries) {
      if (!Number.isInteger(e.amountMinor) || e.amountMinor <= 0) {
        throw new BadRequestException('Entry amounts must be positive integers (minor units)');
      }
      if (e.direction === 'debit') debit += e.amountMinor;
      else credit += e.amountMinor;
    }
    if (debit !== credit) {
      throw new BadRequestException(`Unbalanced journal: debits ${debit} ≠ credits ${credit}`);
    }
  }
}
