/**
 * Lithic API object shapes — 1:1 with the Lithic processor. These are the exact field names,
 * enum values, and event model Lithic uses, so the bank "speaks Lithic" at the processor boundary.
 * See https://docs.lithic.com (Transaction, Card, Payment, Events).
 */

// ── Card ──
export type CardState = 'OPEN' | 'PAUSED' | 'CLOSED' | 'PENDING_ACTIVATION' | 'PENDING_FULFILLMENT';
export type CardType = 'VIRTUAL' | 'PHYSICAL' | 'MERCHANT_LOCKED' | 'SINGLE_USE';
export type SpendLimitDuration = 'TRANSACTION' | 'DAILY' | 'MONTHLY' | 'ANNUALLY' | 'FOREVER';

export interface LithicCard {
  token: string;
  account_token: string;
  type: CardType;
  state: CardState;
  last_four: string;
  pan?: string; // returned only at creation / via reveal — never persisted to clients
  cvv?: string;
  exp_month: string;
  exp_year: string;
  spend_limit: number; // minor units
  spend_limit_duration: SpendLimitDuration;
  memo?: string;
  created: string; // ISO 8601
}

// ── Transaction (card) ──
export type TransactionStatus = 'PENDING' | 'SETTLED' | 'DECLINED' | 'VOIDED' | 'EXPIRED';
export type TransactionResult = 'APPROVED' | 'DECLINED';
export type CardEventType =
  | 'AUTHORIZATION' | 'AUTHORIZATION_ADVICE' | 'AUTHORIZATION_REVERSAL' | 'AUTHORIZATION_EXPIRY'
  | 'BALANCE_INQUIRY' | 'CLEARING' | 'CORRECTION_CREDIT' | 'CORRECTION_DEBIT'
  | 'CREDIT_AUTHORIZATION' | 'FINANCIAL_AUTHORIZATION' | 'FINANCIAL_CREDIT_AUTHORIZATION'
  | 'RETURN' | 'RETURN_REVERSAL';
export type CardEventResult =
  | 'APPROVED' | 'DECLINED' | 'INSUFFICIENT_FUNDS' | 'CARD_PAUSED' | 'CARD_CLOSED'
  | 'UNAUTHORIZED_MERCHANT' | 'CARD_NOT_ACTIVATED' | 'INACTIVE_ACCOUNT';

export interface LithicTransactionEvent {
  token: string;
  amount: number; // minor units
  type: CardEventType;
  result: CardEventResult;
  created: string;
}

export interface LithicMerchant {
  acceptor_id: string;
  city?: string;
  country?: string;
  descriptor: string;
  mcc?: string;
  state?: string;
}

export interface LithicTransaction {
  token: string;
  account_token: string;
  card_token: string;
  amount: number; // minor units
  authorization_amount: number;
  settled_amount: number;
  authorization_code?: string;
  status: TransactionStatus;
  result: TransactionResult;
  network: string;
  merchant: LithicMerchant;
  events: LithicTransactionEvent[];
  created: string;
}

// ── ACH Payment ──
export type PaymentDirection = 'DEBIT' | 'CREDIT';
export type PaymentMethod = 'ACH_NEXT_DAY' | 'ACH_SAME_DAY';
export type PaymentStatus = 'PENDING' | 'SETTLED' | 'DECLINED' | 'EXPIRED' | 'VOIDED' | 'RETURNED' | 'REVERSED';
export type PaymentResult = 'APPROVED' | 'DECLINED';
export type PaymentEventType =
  | 'ACH_ORIGINATION_INITIATED' | 'ACH_ORIGINATION_REVIEWED' | 'ACH_ORIGINATION_PROCESSED'
  | 'ACH_ORIGINATION_SETTLED' | 'ACH_ORIGINATION_RELEASED' | 'ACH_RETURN_INITIATED'
  | 'ACH_RETURN_PROCESSED' | 'ACH_RECEIPT_PROCESSED' | 'ACH_RECEIPT_SETTLED';

export interface LithicPaymentEvent {
  token: string;
  amount: number;
  type: PaymentEventType;
  result: PaymentResult | null;
  created: string;
}

export interface LithicPayment {
  token: string;
  category: 'ACH';
  direction: PaymentDirection;
  method: PaymentMethod;
  status: PaymentStatus;
  result: PaymentResult;
  amount: number; // minor units
  financial_account_token: string;
  external_bank_account_token: string;
  events: LithicPaymentEvent[];
  created: string;
}

// ── Webhook envelope (Events API) ──
export type WebhookEventType =
  | 'transaction.created' | 'transaction.updated'
  | 'payment_transaction.created' | 'payment_transaction.updated'
  | 'card.created' | 'card.updated';

export interface LithicWebhookEvent<T = unknown> {
  id: string; // event token; echoed in the webhook-id header
  type: WebhookEventType;
  payload: T;
}
