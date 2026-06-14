"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardTransactionsRelations = exports.cardsRelations = exports.transactionsRelations = exports.accountsRelations = exports.usersRelations = exports.cardTransactions = exports.cards = exports.transactions = exports.accounts = exports.users = exports.cardTransactionStatusEnum = exports.cardStatusEnum = exports.transactionStatusEnum = exports.transactionTypeEnum = exports.accountStatusEnum = exports.accountTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.accountTypeEnum = (0, pg_core_1.pgEnum)('account_type', ['checking', 'savings']);
exports.accountStatusEnum = (0, pg_core_1.pgEnum)('account_status', ['active', 'frozen', 'closed']);
exports.transactionTypeEnum = (0, pg_core_1.pgEnum)('transaction_type', ['deposit', 'withdrawal', 'transfer', 'card_auth', 'card_settlement', 'card_void']);
exports.transactionStatusEnum = (0, pg_core_1.pgEnum)('transaction_status', ['pending', 'completed', 'failed', 'reversed']);
exports.cardStatusEnum = (0, pg_core_1.pgEnum)('card_status', ['active', 'frozen', 'cancelled']);
exports.cardTransactionStatusEnum = (0, pg_core_1.pgEnum)('card_transaction_status', ['authorized', 'declined', 'settled', 'voided']);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.accounts = (0, pg_core_1.pgTable)('accounts', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    type: (0, exports.accountTypeEnum)('type').notNull().default('checking'),
    balance: (0, pg_core_1.decimal)('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
    status: (0, exports.accountStatusEnum)('status').notNull().default('active'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.transactions = (0, pg_core_1.pgTable)('transactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    accountId: (0, pg_core_1.integer)('account_id').notNull().references(() => exports.accounts.id, { onDelete: 'cascade' }),
    type: (0, exports.transactionTypeEnum)('type').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 2 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, exports.transactionStatusEnum)('status').notNull().default('pending'),
    metadata: (0, pg_core_1.text)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.cards = (0, pg_core_1.pgTable)('cards', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    accountId: (0, pg_core_1.integer)('account_id').notNull().references(() => exports.accounts.id, { onDelete: 'cascade' }),
    lithicCardToken: (0, pg_core_1.varchar)('lithic_card_token', { length: 255 }).unique(),
    lastFour: (0, pg_core_1.varchar)('last_four', { length: 4 }),
    cardNumber: (0, pg_core_1.varchar)('card_number', { length: 255 }),
    expiryMonth: (0, pg_core_1.varchar)('expiry_month', { length: 2 }),
    expiryYear: (0, pg_core_1.varchar)('expiry_year', { length: 4 }),
    status: (0, exports.cardStatusEnum)('status').notNull().default('active'),
    spendLimit: (0, pg_core_1.decimal)('spend_limit', { precision: 12, scale: 2 }),
    spendLimitPeriod: (0, pg_core_1.varchar)('spend_limit_period', { length: 20 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.cardTransactions = (0, pg_core_1.pgTable)('card_transactions', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    cardId: (0, pg_core_1.integer)('card_id').notNull().references(() => exports.cards.id, { onDelete: 'cascade' }),
    transactionId: (0, pg_core_1.integer)('transaction_id').references(() => exports.transactions.id),
    lithicTransactionToken: (0, pg_core_1.varchar)('lithic_transaction_token', { length: 255 }).unique(),
    merchantName: (0, pg_core_1.varchar)('merchant_name', { length: 255 }),
    merchantMcc: (0, pg_core_1.varchar)('merchant_mcc', { length: 4 }),
    merchantCity: (0, pg_core_1.varchar)('merchant_city', { length: 100 }),
    merchantState: (0, pg_core_1.varchar)('merchant_state', { length: 50 }),
    merchantCountry: (0, pg_core_1.varchar)('merchant_country', { length: 2 }),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 2 }).notNull(),
    status: (0, exports.cardTransactionStatusEnum)('status').notNull().default('authorized'),
    authCode: (0, pg_core_1.varchar)('auth_code', { length: 50 }),
    declinedReason: (0, pg_core_1.text)('declined_reason'),
    metadata: (0, pg_core_1.text)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    accounts: many(exports.accounts),
}));
exports.accountsRelations = (0, drizzle_orm_1.relations)(exports.accounts, ({ one, many }) => ({
    user: one(exports.users, {
        fields: [exports.accounts.userId],
        references: [exports.users.id],
    }),
    transactions: many(exports.transactions),
    cards: many(exports.cards),
}));
exports.transactionsRelations = (0, drizzle_orm_1.relations)(exports.transactions, ({ one }) => ({
    account: one(exports.accounts, {
        fields: [exports.transactions.accountId],
        references: [exports.accounts.id],
    }),
}));
exports.cardsRelations = (0, drizzle_orm_1.relations)(exports.cards, ({ one, many }) => ({
    account: one(exports.accounts, {
        fields: [exports.cards.accountId],
        references: [exports.accounts.id],
    }),
    cardTransactions: many(exports.cardTransactions),
}));
exports.cardTransactionsRelations = (0, drizzle_orm_1.relations)(exports.cardTransactions, ({ one }) => ({
    card: one(exports.cards, {
        fields: [exports.cardTransactions.cardId],
        references: [exports.cards.id],
    }),
    transaction: one(exports.transactions, {
        fields: [exports.cardTransactions.transactionId],
        references: [exports.transactions.id],
    }),
}));
//# sourceMappingURL=schema.js.map