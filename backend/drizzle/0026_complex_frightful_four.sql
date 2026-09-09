CREATE TYPE "public"."leave_status" AS ENUM('submitted', 'approved', 'denied');--> statement-breakpoint
ALTER TABLE "leave_requests" RENAME COLUMN "approved" TO "status";