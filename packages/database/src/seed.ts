import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcryptjs from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users, accounts, ledgerAccounts, ledgerTransactions, ledgerEntries } from './schema';

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
  const testUsers = await db
    .insert(users)
    .values([
      { email: 'alice@example.com', passwordHash, firstName: 'Alice', lastName: 'Anderson' },
      { email: 'bob@example.com', passwordHash, firstName: 'Bob', lastName: 'Brown' },
    ])
    .returning();
  console.log(`Created ${testUsers.length} users`);

  // Customer accounts with their opening balances.
  const seedAccounts = [
    { userId: testUsers[0].id, type: 'checking' as const, opening: '5000.00' },
    { userId: testUsers[0].id, type: 'savings' as const, opening: '10000.00' },
    { userId: testUsers[1].id, type: 'checking' as const, opening: '2500.00' },
  ];

  let bankCashMinor = 0;
  for (const [i, sa] of seedAccounts.entries()) {
    const [account] = await db
      .insert(accounts)
      .values({ userId: sa.userId, type: sa.type, status: 'active' })
      .returning();

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

  console.log('\nSeed data created successfully!');
  console.log('Login credentials:');
  console.log('  Alice: alice@example.com / password123');
  console.log('  Bob: bob@example.com / password123');

  await client.end();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
