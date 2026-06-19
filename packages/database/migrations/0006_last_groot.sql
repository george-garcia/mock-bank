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
DO $$ BEGIN
 ALTER TABLE "statements" ADD CONSTRAINT "statements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
