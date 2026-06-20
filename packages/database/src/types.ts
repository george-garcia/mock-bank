// Re-export schema types for shared usage
export type {
  User, NewUser,
  Account, NewAccount,
  LedgerAccount, NewLedgerAccount,
  LedgerTransaction, NewLedgerTransaction,
  LedgerEntry, NewLedgerEntry,
  Hold, NewHold,
  Card, NewCard,
  CardTransaction, NewCardTransaction,
  CardTransactionEvent, NewCardTransactionEvent,
  OtpCode, NewOtpCode,
  Partner, NewPartner,
  PartnerApiKey, NewPartnerApiKey,
  ConnectLinkSession, NewConnectLinkSession,
  ConnectGrant, NewConnectGrant,
  Payment, NewPayment,
  PaymentEvent, NewPaymentEvent,
} from './schema';

// Database connection type
export type Database = ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>;