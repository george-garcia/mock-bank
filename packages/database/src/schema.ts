import { pgTable, serial, varchar, integer, bigint, timestamp, text, decimal, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'frozen', 'closed']);
export const cardStatusEnum = pgEnum('card_status', ['active', 'frozen', 'cancelled']);
export const cardTransactionStatusEnum = pgEnum('card_transaction_status', ['authorized', 'declined', 'settled', 'voided']);
export const twoFactorMethodEnum = pgEnum('two_factor_method', ['none', 'email', 'totp']);
export const otpPurposeEnum = pgEnum('otp_purpose', ['login', 'enable']);

// Double-entry ledger enums
export const ledgerAccountCategoryEnum = pgEnum('ledger_account_category', ['asset', 'liability', 'equity', 'revenue', 'expense']);
export const ledgerSideEnum = pgEnum('ledger_side', ['debit', 'credit']);
export const ledgerTxnTypeEnum = pgEnum('ledger_txn_type', [
  'deposit', 'withdrawal', 'transfer', 'card_settlement', 'card_auth', 'reversal', 'refund', 'fee', 'adjustment',
]);
export const ledgerTxnStatusEnum = pgEnum('ledger_txn_status', ['pending', 'posted', 'reversed']);
export const holdStatusEnum = pgEnum('hold_status', ['active', 'released', 'captured', 'expired']);
export const holdTypeEnum = pgEnum('hold_type', ['card_auth', 'manual']);
export const pendingDepositStatusEnum = pgEnum('pending_deposit_status', ['pending', 'cleared', 'failed']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  twoFactorMethod: twoFactorMethodEnum('two_factor_method').notNull().default('none'),
  totpSecret: varchar('totp_secret', { length: 255 }), // base32 secret, only active once twoFactorMethod = 'totp'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// OTP codes table (email one-time codes for login challenge and enabling email 2FA)
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 255 }).notNull(), // bcrypt hash — never store plaintext
  purpose: otpPurposeEnum('purpose').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Customer bank accounts. Identity/metadata only — the spendable balance lives on the
// linked ledger_account (the source of truth, maintained atomically by the posting routine).
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: accountTypeEnum('type').notNull().default('checking'),
  status: accountStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Double-entry ledger ───────────────────────────────────────────────────

// Every account in the double-entry system: customer deposit accounts (liabilities of
// the bank) and internal GL accounts (bank cash, clearing, card network, etc.).
export const ledgerAccounts = pgTable('ledger_accounts', {
  id: serial('id').primaryKey(),
  // Set for customer-facing accounts; null for internal GL accounts.
  accountId: integer('account_id').references(() => accounts.id, { onDelete: 'restrict' }),
  // Stable key for internal GL accounts (e.g. 'bank_cash'); null for customer accounts.
  systemKind: varchar('system_kind', { length: 64 }),
  name: varchar('name', { length: 255 }).notNull(),
  category: ledgerAccountCategoryEnum('category').notNull(),
  normalSide: ledgerSideEnum('normal_side').notNull(),
  // Cached balance in minor units, in the account's normal-side orientation. Maintained
  // only inside the posting transaction; reconcilable by summing immutable entries.
  balanceMinor: bigint('balance_minor', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  systemKindIdx: uniqueIndex('ledger_accounts_system_kind_idx').on(t.systemKind),
  accountIdx: uniqueIndex('ledger_accounts_account_id_idx').on(t.accountId),
}));

// Journal headers. One per posted money movement; immutable once posted. A reversal is a
// new journal that references the original via reversalOfId — never an edit of entries.
export const ledgerTransactions = pgTable('ledger_transactions', {
  id: serial('id').primaryKey(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
  type: ledgerTxnTypeEnum('type').notNull(),
  status: ledgerTxnStatusEnum('status').notNull().default('posted'),
  description: text('description'),
  reversalOfId: integer('reversal_of_id'),
  metadata: text('metadata'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Immutable, append-only postings. For each transactionId, sum(debits) === sum(credits).
export const ledgerEntries = pgTable('ledger_entries', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').notNull().references(() => ledgerTransactions.id, { onDelete: 'restrict' }),
  ledgerAccountId: integer('ledger_account_id').notNull().references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
  direction: ledgerSideEnum('direction').notNull(),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(), // always positive
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Holds reduce a customer account's *available* balance without moving posted funds
// (e.g. a card authorization). Released/expired holds free the funds; a captured hold has
// been turned into a posted settlement.
export const holds = pgTable('holds', {
  id: serial('id').primaryKey(),
  ledgerAccountId: integer('ledger_account_id').notNull().references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(), // always positive
  status: holdStatusEnum('status').notNull().default('active'),
  type: holdTypeEnum('type').notNull(),
  externalRef: varchar('external_ref', { length: 255 }).unique(), // e.g. card auth token
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ACH-style deposits that have been initiated but not yet cleared. A durable, restart-safe
// queue: a scheduled job posts each to the ledger once clearAt passes. Funds are not credited
// (not in the ledger) until cleared.
export const pendingDeposits = pgTable('pending_deposits', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  description: text('description'),
  source: varchar('source', { length: 64 }),
  status: pendingDepositStatusEnum('status').notNull().default('pending'),
  clearAt: timestamp('clear_at', { withTimezone: true }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(), // used when posting on clear
  clearedTransactionId: integer('cleared_transaction_id').references(() => ledgerTransactions.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Append-only audit trail of security- and money-significant events.
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }), // null = system/webhook
  action: varchar('action', { length: 100 }).notNull(), // e.g. 'money.deposit', 'auth.login', 'card.refund'
  targetType: varchar('target_type', { length: 50 }),
  targetId: varchar('target_id', { length: 64 }),
  amountMinor: bigint('amount_minor', { mode: 'number' }),
  ip: varchar('ip', { length: 64 }),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Cards ─────────────────────────────────────────────────────────────────

export const cards = pgTable('cards', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  lithicCardToken: varchar('lithic_card_token', { length: 255 }).unique(),
  lastFour: varchar('last_four', { length: 4 }),
  cardNumber: varchar('card_number', { length: 255 }), // tokenized/processor-held in a real system
  expiryMonth: varchar('expiry_month', { length: 2 }),
  expiryYear: varchar('expiry_year', { length: 4 }),
  status: cardStatusEnum('status').notNull().default('active'),
  spendLimit: decimal('spend_limit', { precision: 12, scale: 2 }),
  spendLimitPeriod: varchar('spend_limit_period', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cardTransactions = pgTable('card_transactions', {
  id: serial('id').primaryKey(),
  cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  // Links to the ledger journal created at settlement (populated once settled).
  transactionId: integer('transaction_id').references(() => ledgerTransactions.id),
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
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Relations ─────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  otpCodes: many(otpCodes),
}));

export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, { fields: [otpCodes.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  ledgerAccount: one(ledgerAccounts, { fields: [accounts.id], references: [ledgerAccounts.accountId] }),
  cards: many(cards),
}));

export const ledgerAccountsRelations = relations(ledgerAccounts, ({ one, many }) => ({
  account: one(accounts, { fields: [ledgerAccounts.accountId], references: [accounts.id] }),
  entries: many(ledgerEntries),
}));

export const ledgerTransactionsRelations = relations(ledgerTransactions, ({ many }) => ({
  entries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  transaction: one(ledgerTransactions, { fields: [ledgerEntries.transactionId], references: [ledgerTransactions.id] }),
  ledgerAccount: one(ledgerAccounts, { fields: [ledgerEntries.ledgerAccountId], references: [ledgerAccounts.id] }),
}));

export const holdsRelations = relations(holds, ({ one }) => ({
  ledgerAccount: one(ledgerAccounts, { fields: [holds.ledgerAccountId], references: [ledgerAccounts.id] }),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  account: one(accounts, { fields: [cards.accountId], references: [accounts.id] }),
  cardTransactions: many(cardTransactions),
}));

export const cardTransactionsRelations = relations(cardTransactions, ({ one }) => ({
  card: one(cards, { fields: [cardTransactions.cardId], references: [cards.id] }),
  transaction: one(ledgerTransactions, { fields: [cardTransactions.transactionId], references: [ledgerTransactions.id] }),
}));

// ─── Types ─────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type LedgerAccount = typeof ledgerAccounts.$inferSelect;
export type NewLedgerAccount = typeof ledgerAccounts.$inferInsert;
export type LedgerTransaction = typeof ledgerTransactions.$inferSelect;
export type NewLedgerTransaction = typeof ledgerTransactions.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type Hold = typeof holds.$inferSelect;
export type NewHold = typeof holds.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type PendingDeposit = typeof pendingDeposits.$inferSelect;
export type NewPendingDeposit = typeof pendingDeposits.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type NewCardTransaction = typeof cardTransactions.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;
