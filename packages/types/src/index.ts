// Shared types for the mock bank application

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface JwtPayload {
  sub: number; // user id
  email: string;
}

export interface LithicWebhookEvent {
  event_type: string;
  token: string;
  payload: Record<string, unknown>;
}

// Re-export database types
export type {
  User,
  NewUser,
  Account,
  NewAccount,
  Transaction,
  NewTransaction,
  Card,
  NewCard,
  CardTransaction,
  NewCardTransaction,
} from '@mock-bank/database';