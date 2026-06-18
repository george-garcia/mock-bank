DO $$ BEGIN
 CREATE TYPE "public"."pending_deposit_status" AS ENUM('pending', 'cleared', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
