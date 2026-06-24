import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcryptjs from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users, accounts, ledgerAccounts, ledgerTransactions, ledgerEntries, staffUsers } from './schema';

/**
 * Idempotent demo seed — safe to run against a live database. It creates a recruiter-facing
 * customer (`recruiter@demo.com`) with a checking + savings account and a realistic history of
 * deposits, withdrawals, and a transfer, plus a staff user (`admin-recruiter@demo.com`) for the
 * admin console. If the accounts already exist it does nothing, so re-running never duplicates.
 */
const connectionString =
  process.env.DATABASE_URL || 'postgresql://mockbank:mockbank_dev@localhost:5432/mockbank';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'RecruiterDemo!2026';
const CUSTOMER_EMAIL = 'recruiter@demo.com';
const STAFF_EMAIL = 'admin-recruiter@demo.com';

function toMinor(decimal: string): number {
  const [whole, frac = ''] = decimal.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seedDemo() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  const passwordHash = await bcryptjs.hash(DEMO_PASSWORD, 10);

  // ── Staff demo (admin console) ────────────────────────────────────────────
  const existingStaff = await db.select().from(staffUsers).where(eq(staffUsers.email, STAFF_EMAIL));
  if (existingStaff.length === 0) {
    await db.insert(staffUsers).values({
      email: STAFF_EMAIL,
      passwordHash,
      firstName: 'Riley',
      lastName: 'Recruiter',
      role: 'admin',
    });
    console.log(`Created demo staff: ${STAFF_EMAIL} (admin)`);
  } else {
    console.log(`Demo staff already exists: ${STAFF_EMAIL} (skipped)`);
  }

  // ── Customer demo (bank app) ──────────────────────────────────────────────
  const existingUser = await db.select().from(users).where(eq(users.email, CUSTOMER_EMAIL));
  if (existingUser.length > 0) {
    console.log(`Demo customer already exists: ${CUSTOMER_EMAIL} (skipped)`);
    await client.end();
    return;
  }

  // Bank cash GL account (find-or-create — the main seed may not have run on this box).
  let [bankCash] = await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.systemKind, 'bank_cash'));
  if (!bankCash) {
    [bankCash] = await db
      .insert(ledgerAccounts)
      .values({ systemKind: 'bank_cash', name: 'Bank Cash', category: 'asset', normalSide: 'debit' })
      .returning();
  }

  const [user] = await db
    .insert(users)
    .values({ email: CUSTOMER_EMAIL, passwordHash, firstName: 'Riley', lastName: 'Recruiter' })
    .returning();

  const [checking] = await db
    .insert(accounts)
    .values({ userId: user.id, type: 'checking', status: 'active' })
    .returning();
  const [savings] = await db
    .insert(accounts)
    .values({ userId: user.id, type: 'savings', status: 'active' })
    .returning();

  const [checkingLA] = await db
    .insert(ledgerAccounts)
    .values({ accountId: checking.id, name: `Customer checking #${checking.id}`, category: 'liability', normalSide: 'credit', balanceMinor: 0 })
    .returning();
  const [savingsLA] = await db
    .insert(ledgerAccounts)
    .values({ accountId: savings.id, name: `Customer savings #${savings.id}`, category: 'liability', normalSide: 'credit', balanceMinor: 0 })
    .returning();

  // Cached, normal-side-positive balances we maintain as we post each journal.
  const bal: Record<number, number> = { [checkingLA.id]: 0, [savingsLA.id]: 0 };
  let bankCashDelta = 0;
  let seq = 0;

  async function post(opts: {
    type: 'deposit' | 'withdrawal' | 'transfer';
    description: string;
    createdAt: Date;
    debit: { la: number; amt: number };
    credit: { la: number; amt: number };
  }) {
    const [journal] = await db
      .insert(ledgerTransactions)
      .values({
        idempotencyKey: `seed:demo:${user.id}:${seq++}`,
        type: opts.type,
        status: 'posted',
        description: opts.description,
        createdAt: opts.createdAt,
      })
      .returning();
    await db.insert(ledgerEntries).values([
      { transactionId: journal.id, ledgerAccountId: opts.debit.la, direction: 'debit', amountMinor: opts.debit.amt, createdAt: opts.createdAt },
      { transactionId: journal.id, ledgerAccountId: opts.credit.la, direction: 'credit', amountMinor: opts.credit.amt, createdAt: opts.createdAt },
    ]);
    for (const e of [
      { la: opts.debit.la, dir: 'debit' as const, amt: opts.debit.amt },
      { la: opts.credit.la, dir: 'credit' as const, amt: opts.credit.amt },
    ]) {
      if (e.la === bankCash.id) {
        bankCashDelta += e.dir === 'debit' ? e.amt : -e.amt; // bank cash is debit-normal
      } else if (e.la in bal) {
        bal[e.la] += e.dir === 'credit' ? e.amt : -e.amt; // customer accounts are credit-normal
      }
    }
  }

  const D = (s: string) => toMinor(s);
  // A history that reads like a few months of real activity (kept chronological & never overdrawn).
  await post({ type: 'deposit', description: 'Opening deposit', createdAt: daysAgo(45), debit: { la: bankCash.id, amt: D('4000.00') }, credit: { la: checkingLA.id, amt: D('4000.00') } });
  await post({ type: 'deposit', description: 'Payroll deposit — Acme Corp', createdAt: daysAgo(30), debit: { la: bankCash.id, amt: D('2500.00') }, credit: { la: checkingLA.id, amt: D('2500.00') } });
  await post({ type: 'deposit', description: 'Opening deposit', createdAt: daysAgo(30), debit: { la: bankCash.id, amt: D('5000.00') }, credit: { la: savingsLA.id, amt: D('5000.00') } });
  await post({ type: 'withdrawal', description: 'ATM withdrawal', createdAt: daysAgo(21), debit: { la: checkingLA.id, amt: D('300.00') }, credit: { la: bankCash.id, amt: D('300.00') } });
  await post({ type: 'transfer', description: 'Transfer to savings', createdAt: daysAgo(14), debit: { la: checkingLA.id, amt: D('1000.00') }, credit: { la: savingsLA.id, amt: D('1000.00') } });
  await post({ type: 'deposit', description: 'Payroll deposit — Acme Corp', createdAt: daysAgo(7), debit: { la: bankCash.id, amt: D('2500.00') }, credit: { la: checkingLA.id, amt: D('2500.00') } });
  await post({ type: 'withdrawal', description: 'Rent payment', createdAt: daysAgo(5), debit: { la: checkingLA.id, amt: D('1800.00') }, credit: { la: bankCash.id, amt: D('1800.00') } });
  await post({ type: 'withdrawal', description: 'Groceries — Whole Foods', createdAt: daysAgo(2), debit: { la: checkingLA.id, amt: D('142.55') }, credit: { la: bankCash.id, amt: D('142.55') } });

  await db.update(ledgerAccounts).set({ balanceMinor: bal[checkingLA.id] }).where(eq(ledgerAccounts.id, checkingLA.id));
  await db.update(ledgerAccounts).set({ balanceMinor: bal[savingsLA.id] }).where(eq(ledgerAccounts.id, savingsLA.id));
  // Increment bank cash by the net it moved here — don't clobber any existing balance.
  await db
    .update(ledgerAccounts)
    .set({ balanceMinor: bankCash.balanceMinor + bankCashDelta })
    .where(eq(ledgerAccounts.id, bankCash.id));

  console.log(`Created demo customer: ${CUSTOMER_EMAIL}`);
  console.log(`  Checking #${checking.id}: $${(bal[checkingLA.id] / 100).toFixed(2)}`);
  console.log(`  Savings  #${savings.id}: $${(bal[savingsLA.id] / 100).toFixed(2)}`);

  await client.end();
}

seedDemo().catch((error) => {
  console.error('Demo seed failed:', error);
  process.exit(1);
});
