import { pgTable, serial, varchar, integer, timestamp, text, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'frozen', 'closed']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'transfer', 'card_auth', 'card_settlement', 'card_void']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed', 'reversed']);
export const cardStatusEnum = pgEnum('card_status', ['active', 'frozen', 'cancelled']);
export const cardTransactionStatusEnum = pgEnum('card_transaction_status', ['authorized', 'declined', 'settled', 'voided']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Accounts table
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: accountTypeEnum('type').notNull().default('checking'),
  balance: decimal('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  status: accountStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Transactions table (ledger)
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  type: transactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  status: transactionStatusEnum('status').notNull().default('pending'),
  metadata: text('metadata'), // JSON string for flexible metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Cards table (linked to Lithic)
export const cards = pgTable('cards', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  lithicCardToken: varchar('lithic_card_token', { length: 255 }).unique(),
  lastFour: varchar('last_four', { length: 4 }),
  cardNumber: varchar('card_number', { length: 255 }), // Encrypted or tokenized
  expiryMonth: varchar('expiry_month', { length: 2 }),
  expiryYear: varchar('expiry_year', { length: 4 }),
  status: cardStatusEnum('status').notNull().default('active'),
  spendLimit: decimal('spend_limit', { precision: 12, scale: 2 }),
  spendLimitPeriod: varchar('spend_limit_period', { length: 20 }), // daily, monthly, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Card transactions table
export const cardTransactions = pgTable('card_transactions', {
  id: serial('id').primaryKey(),
  cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  transactionId: integer('transaction_id').references(() => transactions.id),
  lithicTransactionToken: varchar('lithic_transaction_token', { length: 255 }).unique(),
  merchantName: varchar('merchant_name', { length: 255 }),
  merchantMcc: varchar('merchant_mcc', { length: 4 }),
  merchantCity: varchar('merchant_city', { length: 100 }),
  merchantState: varchar('merchant_state', { length: 50 }),
  merchantCountry: varchar('merchant_country', { length: 2 }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  status: cardTransactionStatusEnum('status').notNull().default('authorized'),
  authCode: varchar('auth_code', { length: 50 }),
  declinedReason: text('declined_reason'),
  metadata: text('metadata'), // JSON string for Lithic webhook payload
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  cards: many(cards),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  account: one(accounts, {
    fields: [cards.accountId],
    references: [accounts.id],
  }),
  cardTransactions: many(cardTransactions),
}));

export const cardTransactionsRelations = relations(cardTransactions, ({ one }) => ({
  card: one(cards, {
    fields: [cardTransactions.cardId],
    references: [cards.id],
  }),
  transaction: one(transactions, {
    fields: [cardTransactions.transactionId],
    references: [transactions.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type NewCardTransaction = typeof cardTransactions.$inferInsert;