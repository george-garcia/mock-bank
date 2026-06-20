DO $$ BEGIN
 CREATE TYPE "public"."connect_session_status" AS ENUM('created', 'authorized', 'exchanged', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."connect_transfer_direction" AS ENUM('debit', 'credit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."connect_transfer_status" AS ENUM('posted', 'failed');
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
CREATE TABLE IF NOT EXISTS "connect_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"access_token_hash" varchar(64) NOT NULL,
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
CREATE TABLE IF NOT EXISTS "connect_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"grant_id" integer NOT NULL,
	"direction" "connect_transfer_direction" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"status" "connect_transfer_status" DEFAULT 'posted' NOT NULL,
	"description" text,
	"ledger_transaction_id" integer,
	"idempotency_key" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connect_transfers_idempotency_key_unique" UNIQUE("idempotency_key")
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
ALTER TABLE "cards" ADD COLUMN "cvv" varchar(4);--> statement-breakpoint
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
 ALTER TABLE "connect_transfers" ADD CONSTRAINT "connect_transfers_grant_id_connect_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."connect_grants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connect_transfers" ADD CONSTRAINT "connect_transfers_ledger_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("ledger_transaction_id") REFERENCES "public"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_api_keys" ADD CONSTRAINT "partner_api_keys_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
