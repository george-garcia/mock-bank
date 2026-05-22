import { pgTable, serial, varchar, integer, timestamp, text, decimal, pgEnum } from 'drizzle-orm/pg-core';

// Re-export schema types for shared usage
export type { User, NewUser, Account, NewAccount, Transaction, NewTransaction, Card, NewCard, CardTransaction, NewCardTransaction } from './schema';

// Database connection type
export type Database = ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>;