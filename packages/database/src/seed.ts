import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcryptjs from 'bcryptjs';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { users, accounts, ledgerAccounts, ledgerTransactions, ledgerEntries, staffUsers, cards, partners, partnerApiKeys } from './schema';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

const connectionString = process.env.DATABASE_URL || 'postgresql://mockbank:mockbank_dev@localhost:5432/mockbank';

/** Local cents parser (the seed runs standalone, outside the API). */
function toMinor(decimal: string): number {
  const [whole, frac = ''] = decimal.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

async function seed() {
  console.log('Connecting to database...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Seeding database...');

  // Internal GL accounts (the bank's side of every customer movement).
  const gl = await db
    .insert(ledgerAccounts)
    .values([
      { systemKind: 'bank_cash', name: 'Bank Cash', category: 'asset', normalSide: 'debit' },
      { systemKind: 'card_network', name: 'Card Network Clearing', category: 'liability', normalSide: 'credit' },
      { systemKind: 'ach_clearing', name: 'ACH Clearing', category: 'liability', normalSide: 'credit' },
    ])
    .returning();
  const bankCash = gl.find((g) => g.systemKind === 'bank_cash')!;
  console.log(`Created ${gl.length} internal GL accounts`);

  const passwordHash = await bcryptjs.hash('password123', 10);
  // Bank customers (mock-bank front-end).
  const testUsers = await db
    .insert(users)
    .values([
      { email: 'alice@example.com', passwordHash, firstName: 'Alice', lastName: 'Anderson' },
      { email: 'bob@example.com', passwordHash, firstName: 'Bob', lastName: 'Brown' },
    ])
    .returning();
  console.log(`Created ${testUsers.length} customers`);

  // Staff (admin panel) — a completely separate identity domain.
  const staff = await db
    .insert(staffUsers)
    .values([
      { email: 'admin@bank.internal', passwordHash, firstName: 'Avery', lastName: 'Admin', role: 'admin' },
      { email: 'support@bank.internal', passwordHash, firstName: 'Sam', lastName: 'Support', role: 'auditor' },
    ])
    .returning();
  console.log(`Created ${staff.length} staff users`);

  // Customer accounts with their opening balances.
  const seedAccounts = [
    { userId: testUsers[0].id, type: 'checking' as const, opening: '5000.00' },
    { userId: testUsers[0].id, type: 'savings' as const, opening: '10000.00' },
    { userId: testUsers[1].id, type: 'checking' as const, opening: '2500.00' },
  ];

  let bankCashMinor = 0;
  let aliceCheckingId: number | undefined;
  for (const [i, sa] of seedAccounts.entries()) {
    const [account] = await db
      .insert(accounts)
      .values({ userId: sa.userId, type: sa.type, status: 'active' })
      .returning();
    if (i === 0) aliceCheckingId = account.id;

    const [ledgerAccount] = await db
      .insert(ledgerAccounts)
      .values({
        accountId: account.id,
        name: `Customer ${sa.type} #${account.id}`,
        category: 'liability',
        normalSide: 'credit',
        balanceMinor: 0,
      })
      .returning();

    const minor = toMinor(sa.opening);
    if (minor > 0) {
      // Opening balance as a proper balanced journal: debit bank cash, credit the customer.
      const [journal] = await db
        .insert(ledgerTransactions)
        .values({
          idempotencyKey: `seed:opening:${i}`,
          type: 'deposit',
          status: 'posted',
          description: 'Opening balance',
        })
        .returning();

      await db.insert(ledgerEntries).values([
        { transactionId: journal.id, ledgerAccountId: bankCash.id, direction: 'debit', amountMinor: minor },
        { transactionId: journal.id, ledgerAccountId: ledgerAccount.id, direction: 'credit', amountMinor: minor },
      ]);

      await db.update(ledgerAccounts).set({ balanceMinor: minor }).where(eq(ledgerAccounts.id, ledgerAccount.id));
      bankCashMinor += minor;
    }
  }

  await db.update(ledgerAccounts).set({ balanceMinor: bankCashMinor }).where(eq(ledgerAccounts.id, bankCash.id));
  console.log(`Created ${seedAccounts.length} customer accounts with opening balances`);

  // A deterministic test card for Alice's checking account, so external merchants (the gambling
  // site) can "swipe" a known PAN out of the box. In a real system the PAN/cvv live only at the
  // processor; here they are stored so the mock Network API can authorize by PAN.
  if (aliceCheckingId) {
    await db.insert(cards).values({
      accountId: aliceCheckingId,
      lithicCardToken: 'seed-card-alice',
      type: 'VIRTUAL',
      lastFour: '1111',
      cardNumber: '4111111111111111',
      cvv: '123',
      expiryMonth: '12',
      expiryYear: '2030',
      state: 'OPEN',
    });
    console.log('Created 1 test card for Alice (checking)');
  }

  // A third-party partner (the gambling site) with a known dev API key, so its backend can
  // authenticate to the bank's Network + Connect APIs immediately.
  const DEV_PARTNER_KEY = 'sk_test_luckyspin_dev';
  const [partner] = await db
    .insert(partners)
    .values({ name: 'Lucky Spin Casino', kind: 'merchant' })
    .returning();
  await db.insert(partnerApiKeys).values({
    partnerId: partner.id,
    keyPrefix: DEV_PARTNER_KEY.slice(0, 12),
    keyHash: sha256(DEV_PARTNER_KEY),
    label: 'dev key',
  });
  console.log(`Created partner "${partner.name}" with API key: ${DEV_PARTNER_KEY}`);

  console.log('\nSeed data created successfully!');
  console.log('Bank customers (mock-bank app):');
  console.log('  Alice: alice@example.com / password123');
  console.log('  Bob:   bob@example.com / password123');
  console.log('Staff (admin panel — separate login):');
  console.log('  Admin:   admin@bank.internal / password123  (engineer)');
  console.log('  Support: support@bank.internal / password123  (customer service)');
  console.log('Test card (for the gambling site "swipe" demo):');
  console.log('  PAN 4111 1111 1111 1111  exp 12/2030  cvv 123  (Alice, checking)');
  console.log('Partner (gambling site) API key:');
  console.log('  sk_test_luckyspin_dev');

  await client.end();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
