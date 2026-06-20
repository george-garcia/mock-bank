DO $$ BEGIN
 CREATE TYPE "public"."account_status" AS ENUM('active', 'frozen', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."account_type" AS ENUM('checking', 'savings');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_event_result" AS ENUM('APPROVED', 'DECLINED', 'INSUFFICIENT_FUNDS', 'CARD_PAUSED', 'CARD_CLOSED', 'UNAUTHORIZED_MERCHANT', 'CARD_NOT_ACTIVATED', 'INACTIVE_ACCOUNT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_event_type" AS ENUM('AUTHORIZATION', 'AUTHORIZATION_ADVICE', 'AUTHORIZATION_REVERSAL', 'AUTHORIZATION_EXPIRY', 'BALANCE_INQUIRY', 'CLEARING', 'CORRECTION_CREDIT', 'CORRECTION_DEBIT', 'CREDIT_AUTHORIZATION', 'FINANCIAL_AUTHORIZATION', 'FINANCIAL_CREDIT_AUTHORIZATION', 'RETURN', 'RETURN_REVERSAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_state" AS ENUM('OPEN', 'PAUSED', 'CLOSED', 'PENDING_ACTIVATION', 'PENDING_FULFILLMENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."card_type" AS ENUM('VIRTUAL', 'PHYSICAL', 'MERCHANT_LOCKED', 'SINGLE_USE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."connect_session_status" AS ENUM('created', 'authorized', 'exchanged', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."hold_status" AS ENUM('active', 'released', 'captured', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."hold_type" AS ENUM('authorization', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_account_category" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_side" AS ENUM('debit', 'credit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_txn_status" AS ENUM('pending', 'posted', 'reversed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ledger_txn_type" AS ENUM('deposit', 'withdrawal', 'transfer', 'card_clearing', 'return', 'ach_debit', 'ach_credit', 'reversal', 'fee', 'adjustment');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."otp_purpose" AS ENUM('login', 'enable');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."partner_kind" AS ENUM('merchant', 'connect');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_category" AS ENUM('ACH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_direction" AS ENUM('DEBIT', 'CREDIT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_event_type" AS ENUM('ACH_ORIGINATION_INITIATED', 'ACH_ORIGINATION_REVIEWED', 'ACH_ORIGINATION_PROCESSED', 'ACH_ORIGINATION_SETTLED', 'ACH_ORIGINATION_RELEASED', 'ACH_RETURN_INITIATED', 'ACH_RETURN_PROCESSED', 'ACH_RECEIPT_PROCESSED', 'ACH_RECEIPT_SETTLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_method" AS ENUM('ACH_NEXT_DAY', 'ACH_SAME_DAY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_result" AS ENUM('APPROVED', 'DECLINED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SETTLED', 'DECLINED', 'EXPIRED', 'VOIDED', 'RETURNED', 'REVERSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pending_deposit_status" AS ENUM('pending', 'cleared', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."spend_limit_duration" AS ENUM('TRANSACTION', 'DAILY', 'MONTHLY', 'ANNUALLY', 'FOREVER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."staff_role" AS ENUM('admin', 'auditor');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transaction_result" AS ENUM('APPROVED', 'DECLINED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SETTLED', 'DECLINED', 'VOIDED', 'EXPIRED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."two_factor_method" AS ENUM('none', 'email', 'totp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "account_type" DEFAULT 'checking' NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_type" varchar(16) DEFAULT 'system' NOT NULL,
	"actor_user_id" integer,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" varchar(64),
	"amount_minor" bigint,
	"ip" varchar(64),
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_transaction_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_transaction_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"type" "card_event_type" NOT NULL,
	"amount" bigint NOT NULL,
	"result" "card_event_result" NOT NULL,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_transaction_events_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"token" varchar(255),
	"ledger_transaction_id" integer,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"result" "transaction_result",
	"amount" bigint NOT NULL,
	"authorization_amount" bigint,
	"settled_amount" bigint,
	"authorization_code" varchar(50),
	"network" varchar(32),
	"merchant_descriptor" varchar(255),
	"merchant_acceptor_id" varchar(64),
	"merchant_mcc" varchar(4),
	"merchant_city" varchar(100),
	"merchant_state" varchar(50),
	"merchant_country" varchar(3),
	"declined_reason" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_transactions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"lithic_card_token" varchar(255),
	"type" "card_type" DEFAULT 'VIRTUAL' NOT NULL,
	"state" "card_state" DEFAULT 'OPEN' NOT NULL,
	"last_four" varchar(4),
	"card_number" varchar(255),
	"cvv" varchar(4),
	"expiry_month" varchar(2),
	"expiry_year" varchar(4),
	"spend_limit" numeric(12, 2),
	"spend_limit_duration" "spend_limit_duration",
	"memo" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_lithic_card_token_unique" UNIQUE("lithic_card_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connect_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"access_token_hash" varchar(64) NOT NULL,
	"external_bank_account_token" varchar(255),
	"scopes" varchar(255) DEFAULT 'balances,transfers' NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connect_grants_access_token_hash_unique" UNIQUE("access_token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connect_link_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"link_token" varchar(64) NOT NULL,
	"public_token" varchar(64),
	"status" "connect_session_status" DEFAULT 'created' NOT NULL,
	"scopes" varchar(255) DEFAULT 'balances,transfers' NOT NULL,
	"user_id" integer,
	"account_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connect_link_sessions_link_token_unique" UNIQUE("link_token"),
	CONSTRAINT "connect_link_sessions_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"ledger_account_id" integer NOT NULL,
	"amount_minor" bigint NOT NULL,
	"status" "hold_status" DEFAULT 'active' NOT NULL,
	"type" "hold_type" NOT NULL,
	"external_ref" varchar(255),
	"expires_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holds_external_ref_unique" UNIQUE("external_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"system_kind" varchar(64),
	"name" varchar(255) NOT NULL,
	"category" "ledger_account_category" NOT NULL,
	"normal_side" "ledger_side" NOT NULL,
	"balance_minor" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"ledger_account_id" integer NOT NULL,
	"direction" "ledger_side" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"type" "ledger_txn_type" NOT NULL,
	"status" "ledger_txn_status" DEFAULT 'posted' NOT NULL,
	"description" text,
	"reversal_of_id" integer,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"key_prefix" varchar(32) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"label" varchar(100),
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"kind" "partner_kind" DEFAULT 'merchant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"type" "payment_event_type" NOT NULL,
	"amount" bigint NOT NULL,
	"result" varchar(32),
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"grant_id" integer,
	"ledger_transaction_id" integer,
	"category" "payment_category" DEFAULT 'ACH' NOT NULL,
	"direction" "payment_direction" NOT NULL,
	"method" "payment_method" DEFAULT 'ACH_NEXT_DAY' NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"result" "payment_result",
	"amount" bigint NOT NULL,
	"financial_account_token" varchar(255),
	"external_bank_account_token" varchar(255),
	"idempotency_key" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_token_unique" UNIQUE("token"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"amount_minor" bigint NOT NULL,
	"description" text,
	"source" varchar(64),
	"status" "pending_deposit_status" DEFAULT 'pending' NOT NULL,
	"clear_at" timestamp with time zone NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"cleared_transaction_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_deposits_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"refresh_token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_id" integer,
	"user_agent" varchar(255),
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_user_id" integer NOT NULL,
	"refresh_token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_id" integer,
	"user_agent" varchar(255),
	"ip" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "staff_role" DEFAULT 'auditor' NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"opening_balance_minor" bigint NOT NULL,
	"closing_balance_minor" bigint NOT NULL,
	"total_credits_minor" bigint NOT NULL,
	"total_debits_minor" bigint NOT NULL,
	"transaction_count" integer NOT NULL,
	"lines" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"two_factor_method" "two_factor_method" DEFAULT 'none' NOT NULL,
	"totp_secret" varchar(255),
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_transaction_events" ADD CONSTRAINT "card_transaction_events_card_transaction_id_card_transactions_id_fk" FOREIGN KEY ("card_transaction_id") REFERENCES "public"."card_transactions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_ledger_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("ledger_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connect_grants" ADD CONSTRAINT "connect_grants_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connect_grants" ADD CONSTRAINT "connect_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connect_grants" ADD CONSTRAINT "connect_grants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connect_link_sessions" ADD CONSTRAINT "connect_link_sessions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connect_link_sessions" ADD CONSTRAINT "connect_link_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connect_link_sessions" ADD CONSTRAINT "connect_link_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "holds" ADD CONSTRAINT "holds_ledger_account_id_ledger_accounts_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ledger_account_id_ledger_accounts_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_api_keys" ADD CONSTRAINT "partner_api_keys_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_grant_id_connect_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."connect_grants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_ledger_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("ledger_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pending_deposits" ADD CONSTRAINT "pending_deposits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pending_deposits" ADD CONSTRAINT "pending_deposits_cleared_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("cleared_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_user_id_staff_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "statements" ADD CONSTRAINT "statements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_accounts_system_kind_idx" ON "ledger_accounts" USING btree ("system_kind");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_accounts_account_id_idx" ON "ledger_accounts" USING btree ("account_id");