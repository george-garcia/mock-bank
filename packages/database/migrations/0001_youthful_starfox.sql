DO $$ BEGIN
 CREATE TYPE "public"."hold_status" AS ENUM('active', 'released', 'captured', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."hold_type" AS ENUM('card_auth', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
DO $$ BEGIN
 ALTER TABLE "holds" ADD CONSTRAINT "holds_ledger_account_id_ledger_accounts_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
