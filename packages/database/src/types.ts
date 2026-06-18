// Re-export schema types for shared usage
export type {
  User, NewUser,
  Account, NewAccount,
  LedgerAccount, NewLedgerAccount,
  LedgerTransaction, NewLedgerTransaction,
  LedgerEntry, NewLedgerEntry,
  Card, NewCard,
  CardTransaction, NewCardTransaction,
  OtpCode, NewOtpCode,
} from './schema';

// Database connection type
export type Database = ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>;