import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcryptjs from 'bcryptjs';
import { users, accounts } from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://mockbank:mockbank_dev@localhost:5432/mockbank';

async function seed() {
  console.log('Connecting to database...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Seeding database...');

  // Hash password
  const passwordHash = await bcryptjs.hash('password123', 10);

  // Insert test users
  const testUsers = await db.insert(users).values([
    {
      email: 'alice@example.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Anderson',
    },
    {
      email: 'bob@example.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Brown',
    },
  ]).returning();

  console.log(`Created ${testUsers.length} users`);

  // Insert accounts for users
  const userAccounts = await db.insert(accounts).values([
    {
      userId: testUsers[0].id,
      type: 'checking',
      balance: '5000.00',
      status: 'active',
    },
    {
      userId: testUsers[0].id,
      type: 'savings',
      balance: '10000.00',
      status: 'active',
    },
    {
      userId: testUsers[1].id,
      type: 'checking',
      balance: '2500.00',
      status: 'active',
    },
  ]).returning();

  console.log(`Created ${userAccounts.length} accounts`);

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