CREATE TYPE "public"."status" AS ENUM('complete', 'planned', 'planning');--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status" "status" DEFAULT 'planning' NOT NULL;