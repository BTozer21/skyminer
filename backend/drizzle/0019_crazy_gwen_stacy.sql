ALTER TABLE "machines" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;