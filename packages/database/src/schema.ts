import { pgTable, serial, varchar, integer, bigint, timestamp, text, decimal, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const accountTypeEnum = pgEnum('account_type', ['checking', 'savings']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'frozen', 'closed']);
export const twoFactorMethodEnum = pgEnum('two_factor_method', ['none', 'email', 'totp']);
export const otpPurposeEnum = pgEnum('otp_purpose', ['login', 'enable']);
export const staffRoleEnum = pgEnum('staff_role', ['admin', 'auditor']);

// ─── Lithic processor objects (1:1 with the Lithic API) ──────────────────────
// Card object: state, type, spend_limit_duration.
export const cardStateEnum = pgEnum('card_state', ['OPEN', 'PAUSED', 'CLOSED', 'PENDING_ACTIVATION', 'PENDING_FULFILLMENT']);
export const cardTypeEnum = pgEnum('card_type', ['VIRTUAL', 'PHYSICAL', 'MERCHANT_LOCKED', 'SINGLE_USE']);
export const spendLimitDurationEnum = pgEnum('spend_limit_duration', ['TRANSACTION', 'DAILY', 'MONTHLY', 'ANNUALLY', 'FOREVER']);
// Transaction object: status, result, and the events[] lifecycle.
export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'SETTLED', 'DECLINED', 'VOIDED', 'EXPIRED']);
export const transactionResultEnum = pgEnum('transaction_result', ['APPROVED', 'DECLINED']);
export const cardEventTypeEnum = pgEnum('card_event_type', [
  'AUTHORIZATION', 'AUTHORIZATION_ADVICE', 'AUTHORIZATION_REVERSAL', 'AUTHORIZATION_EXPIRY', 'BALANCE_INQUIRY',
  'CLEARING', 'CORRECTION_CREDIT', 'CORRECTION_DEBIT', 'CREDIT_AUTHORIZATION', 'FINANCIAL_AUTHORIZATION',
  'FINANCIAL_CREDIT_AUTHORIZATION', 'RETURN', 'RETURN_REVERSAL',
]);
export const cardEventResultEnum = pgEnum('card_event_result', [
  'APPROVED', 'DECLINED', 'INSUFFICIENT_FUNDS', 'CARD_PAUSED', 'CARD_CLOSED', 'UNAUTHORIZED_MERCHANT',
  'CARD_NOT_ACTIVATED', 'INACTIVE_ACCOUNT',
]);
// ACH Payment object: direction (DEBIT=pull / CREDIT=push), method, status, result, lifecycle events.
export const paymentCategoryEnum = pgEnum('payment_category', ['ACH']);
export const paymentDirectionEnum = pgEnum('payment_direction', ['DEBIT', 'CREDIT']);
export const paymentMethodEnum = pgEnum('payment_method', ['ACH_NEXT_DAY', 'ACH_SAME_DAY']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'SETTLED', 'DECLINED', 'EXPIRED', 'VOIDED', 'RETURNED', 'REVERSED']);
export const paymentResultEnum = pgEnum('payment_result', ['APPROVED', 'DECLINED']);
export const paymentEventTypeEnum = pgEnum('payment_event_type', [
  'ACH_ORIGINATION_INITIATED', 'ACH_ORIGINATION_REVIEWED', 'ACH_ORIGINATION_PROCESSED', 'ACH_ORIGINATION_SETTLED',
  'ACH_ORIGINATION_RELEASED', 'ACH_RETURN_INITIATED', 'ACH_RETURN_PROCESSED', 'ACH_RECEIPT_PROCESSED', 'ACH_RECEIPT_SETTLED',
]);

// Double-entry ledger enums
export const ledgerAccountCategoryEnum = pgEnum('ledger_account_category', ['asset', 'liability', 'equity', 'revenue', 'expense']);
export const ledgerSideEnum = pgEnum('ledger_side', ['debit', 'credit']);
export const ledgerTxnTypeEnum = pgEnum('ledger_txn_type', [
  'deposit', 'withdrawal', 'transfer', 'card_clearing', 'return', 'ach_debit', 'ach_credit', 'reversal', 'fee', 'adjustment',
]);
export const ledgerTxnStatusEnum = pgEnum('ledger_txn_status', ['pending', 'posted', 'reversed']);
export const holdStatusEnum = pgEnum('hold_status', ['active', 'released', 'captured', 'expired']);
export const holdTypeEnum = pgEnum('hold_type', ['authorization', 'manual']);
export const pendingDepositStatusEnum = pgEnum('pending_deposit_status', ['pending', 'cleared', 'failed']);

// Partner / "Connect" enums — third-party companies (merchants, data partners) that integrate
// with the bank over its public partner APIs (card acceptance + account linking).
export const partnerKindEnum = pgEnum('partner_kind', ['merchant', 'connect']);
export const connectSessionStatusEnum = pgEnum('connect_session_status', ['created', 'authorized', 'exchanged', 'expired']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  twoFactorMethod: twoFactorMethodEnum('two_factor_method').notNull().default('none'),
  totpSecret: varchar('totp_secret', { length: 255 }), // base32 secret, only active once twoFactorMethod = 'totp'
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }), // set while the account is locked
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

// Holds reduce a customer account's *available* balance without moving posted funds (a card
// AUTHORIZATION). Released/expired holds free the funds; a captured hold has been cleared.
export const holds = pgTable('holds', {
  id: serial('id').primaryKey(),
  ledgerAccountId: integer('ledger_account_id').notNull().references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(), // always positive
  status: holdStatusEnum('status').notNull().default('active'),
  type: holdTypeEnum('type').notNull(),
  externalRef: varchar('external_ref', { length: 255 }).unique(), // e.g. the transaction token
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

// Server-side sessions backing refresh tokens, so a session can be revoked (logout) and
// rotated. Only the SHA-256 hash of the refresh token is stored, never the token itself.
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  replacedById: integer('replaced_by_id'), // the session that rotated this one out
  userAgent: varchar('user_agent', { length: 255 }),
  ip: varchar('ip', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Staff users for the admin panel — a separate identity domain from bank customers.
// Created and authenticated entirely independently of the `users` table.
export const staffUsers = pgTable('staff_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: staffRoleEnum('role').notNull().default('auditor'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Refresh-token sessions for staff (admin panel), separate from customer sessions.
export const staffSessions = pgTable('staff_sessions', {
  id: serial('id').primaryKey(),
  staffUserId: integer('staff_user_id').notNull().references(() => staffUsers.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  replacedById: integer('replaced_by_id'),
  userAgent: varchar('user_agent', { length: 255 }),
  ip: varchar('ip', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Immutable account statements for a period, generated from (and reconcilable against) the
// ledger. The line snapshot is stored so the document never changes after generation.
export const statements = pgTable('statements', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  openingBalanceMinor: bigint('opening_balance_minor', { mode: 'number' }).notNull(),
  closingBalanceMinor: bigint('closing_balance_minor', { mode: 'number' }).notNull(),
  totalCreditsMinor: bigint('total_credits_minor', { mode: 'number' }).notNull(),
  totalDebitsMinor: bigint('total_debits_minor', { mode: 'number' }).notNull(),
  transactionCount: integer('transaction_count').notNull(),
  lines: text('lines').notNull(), // JSON snapshot of the statement lines
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Append-only audit trail of security- and money-significant events. The actor may be a
// bank customer, a staff member, or the system — so actorUserId is a plain id paired with
// actorType (no single FK, since customers and staff live in different tables).
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorType: varchar('actor_type', { length: 16 }).notNull().default('system'), // 'customer' | 'staff' | 'system'
  actorUserId: integer('actor_user_id'),
  action: varchar('action', { length: 100 }).notNull(), // e.g. 'money.deposit', 'auth.login', 'card.clearing'
  targetType: varchar('target_type', { length: 50 }),
  targetId: varchar('target_id', { length: 64 }),
  amountMinor: bigint('amount_minor', { mode: 'number' }),
  ip: varchar('ip', { length: 64 }),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Cards (Lithic Card object) ──────────────────────────────────────────────

export const cards = pgTable('cards', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  lithicCardToken: varchar('lithic_card_token', { length: 255 }).unique(), // Lithic Card.token
  type: cardTypeEnum('type').notNull().default('VIRTUAL'),
  state: cardStateEnum('state').notNull().default('OPEN'),
  lastFour: varchar('last_four', { length: 4 }),
  cardNumber: varchar('card_number', { length: 255 }), // Lithic Card.pan — processor-held in production
  cvv: varchar('cvv', { length: 4 }), // sensitive — never returned to clients (see CardsService.sanitize)
  expiryMonth: varchar('expiry_month', { length: 2 }), // Lithic Card.exp_month
  expiryYear: varchar('expiry_year', { length: 4 }), // Lithic Card.exp_year
  spendLimit: decimal('spend_limit', { precision: 12, scale: 2 }),
  spendLimitDuration: spendLimitDurationEnum('spend_limit_duration'),
  memo: varchar('memo', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// A Lithic Transaction (card). Amounts are integer minor units, like Lithic.
export const cardTransactions = pgTable('card_transactions', {
  id: serial('id').primaryKey(),
  cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).unique(), // Lithic Transaction.token
  // Links to the ledger journal created at CLEARING (populated once settled).
  ledgerTransactionId: integer('ledger_transaction_id').references(() => ledgerTransactions.id),
  status: transactionStatusEnum('status').notNull().default('PENDING'),
  result: transactionResultEnum('result'),
  amount: bigint('amount', { mode: 'number' }).notNull(), // requested amount (minor units)
  authorizationAmount: bigint('authorization_amount', { mode: 'number' }), // held amount
  settledAmount: bigint('settled_amount', { mode: 'number' }), // cleared amount
  authorizationCode: varchar('authorization_code', { length: 50 }),
  network: varchar('network', { length: 32 }),
  merchantDescriptor: varchar('merchant_descriptor', { length: 255 }), // Lithic merchant.descriptor
  merchantAcceptorId: varchar('merchant_acceptor_id', { length: 64 }),
  merchantMcc: varchar('merchant_mcc', { length: 4 }),
  merchantCity: varchar('merchant_city', { length: 100 }),
  merchantState: varchar('merchant_state', { length: 50 }),
  merchantCountry: varchar('merchant_country', { length: 3 }),
  declinedReason: text('declined_reason'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// The Lithic Transaction.events[] array — the network event lifecycle (AUTHORIZATION, CLEARING,
// RETURN, …). Immutable, append-only.
export const cardTransactionEvents = pgTable('card_transaction_events', {
  id: serial('id').primaryKey(),
  cardTransactionId: integer('card_transaction_id').notNull().references(() => cardTransactions.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(), // Lithic event token
  type: cardEventTypeEnum('type').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  result: cardEventResultEnum('result').notNull(),
  created: timestamp('created', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Partners & Connect (public partner-facing products) ─────────────────────
//
// The bank offers two products to outside companies (e.g. a gambling site), used purely
// over HTTP — the partner never touches the bank's database directly:
//   • Card acceptance ("Network"): authorize/clear a bank-issued card by PAN, like an acquirer.
//   • Connect: a Plaid-style account-linking flow that moves funds via Lithic ACH Payments.

// A third-party company integrating with the bank.
export const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  kind: partnerKindEnum('kind').notNull().default('merchant'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// API keys a partner uses for server-to-server auth. Only the SHA-256 hash is stored; the
// plaintext key (prefix + secret) is shown once at creation.
export const partnerApiKeys = pgTable('partner_api_keys', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  keyPrefix: varchar('key_prefix', { length: 32 }).notNull(), // non-secret, helps identify the key
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(), // sha256 of the full key
  label: varchar('label', { length: 100 }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// One account-linking attempt. The partner creates it (server-side), the customer authorizes
// it on the bank's hosted Connect page, then the partner exchanges its public token for a grant.
export const connectLinkSessions = pgTable('connect_link_sessions', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  linkToken: varchar('link_token', { length: 64 }).notNull().unique(), // opaque, used to load the hosted UI
  publicToken: varchar('public_token', { length: 64 }).unique(), // minted on authorize, exchanged once
  status: connectSessionStatusEnum('status').notNull().default('created'),
  scopes: varchar('scopes', { length: 255 }).notNull().default('balances,transfers'),
  // Populated when the customer authorizes the link.
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  accountId: integer('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// A durable access grant: the partner's long-lived permission to act on one linked account.
// Only the hash of the access token is stored. The linked account is modeled as a Lithic
// External Bank Account (its token is stored here).
export const connectGrants = pgTable('connect_grants', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  accessTokenHash: varchar('access_token_hash', { length: 64 }).notNull().unique(),
  externalBankAccountToken: varchar('external_bank_account_token', { length: 255 }), // Lithic External Bank Account
  scopes: varchar('scopes', { length: 255 }).notNull().default('balances,transfers'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// A Lithic ACH Payment — a Connect partner moving money on a linked account. DEBIT pulls funds
// out to the partner; CREDIT (cash-out) pushes funds back in. Amounts are integer minor units.
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  token: varchar('token', { length: 255 }).notNull().unique(), // Lithic Payment.token
  grantId: integer('grant_id').references(() => connectGrants.id, { onDelete: 'set null' }),
  ledgerTransactionId: integer('ledger_transaction_id').references(() => ledgerTransactions.id),
  category: paymentCategoryEnum('category').notNull().default('ACH'),
  direction: paymentDirectionEnum('direction').notNull(),
  method: paymentMethodEnum('method').notNull().default('ACH_NEXT_DAY'),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  result: paymentResultEnum('result'),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  financialAccountToken: varchar('financial_account_token', { length: 255 }),
  externalBankAccountToken: varchar('external_bank_account_token', { length: 255 }),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// The Lithic Payment.events[] — the ACH origination/return/receipt lifecycle.
export const paymentEvents = pgTable('payment_events', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  type: paymentEventTypeEnum('type').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  result: varchar('result', { length: 32 }),
  created: timestamp('created', { withTimezone: true }).defaultNow().notNull(),
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

export const cardTransactionsRelations = relations(cardTransactions, ({ one, many }) => ({
  card: one(cards, { fields: [cardTransactions.cardId], references: [cards.id] }),
  ledgerTransaction: one(ledgerTransactions, { fields: [cardTransactions.ledgerTransactionId], references: [ledgerTransactions.id] }),
  events: many(cardTransactionEvents),
}));

export const cardTransactionEventsRelations = relations(cardTransactionEvents, ({ one }) => ({
  cardTransaction: one(cardTransactions, { fields: [cardTransactionEvents.cardTransactionId], references: [cardTransactions.id] }),
}));

export const partnersRelations = relations(partners, ({ many }) => ({
  apiKeys: many(partnerApiKeys),
  grants: many(connectGrants),
}));

export const partnerApiKeysRelations = relations(partnerApiKeys, ({ one }) => ({
  partner: one(partners, { fields: [partnerApiKeys.partnerId], references: [partners.id] }),
}));

export const connectGrantsRelations = relations(connectGrants, ({ one, many }) => ({
  partner: one(partners, { fields: [connectGrants.partnerId], references: [partners.id] }),
  account: one(accounts, { fields: [connectGrants.accountId], references: [accounts.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  grant: one(connectGrants, { fields: [payments.grantId], references: [connectGrants.id] }),
  ledgerTransaction: one(ledgerTransactions, { fields: [payments.ledgerTransactionId], references: [ledgerTransactions.id] }),
  events: many(paymentEvents),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  payment: one(payments, { fields: [paymentEvents.paymentId], references: [payments.id] }),
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
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type StaffUser = typeof staffUsers.$inferSelect;
export type NewStaffUser = typeof staffUsers.$inferInsert;
export type StaffSession = typeof staffSessions.$inferSelect;
export type NewStaffSession = typeof staffSessions.$inferInsert;
export type Statement = typeof statements.$inferSelect;
export type NewStatement = typeof statements.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type NewCardTransaction = typeof cardTransactions.$inferInsert;
export type CardTransactionEvent = typeof cardTransactionEvents.$inferSelect;
export type NewCardTransactionEvent = typeof cardTransactionEvents.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;
export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
export type PartnerApiKey = typeof partnerApiKeys.$inferSelect;
export type NewPartnerApiKey = typeof partnerApiKeys.$inferInsert;
export type ConnectLinkSession = typeof connectLinkSessions.$inferSelect;
export type NewConnectLinkSession = typeof connectLinkSessions.$inferInsert;
export type ConnectGrant = typeof connectGrants.$inferSelect;
export type NewConnectGrant = typeof connectGrants.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type NewPaymentEvent = typeof paymentEvents.$inferInsert;
