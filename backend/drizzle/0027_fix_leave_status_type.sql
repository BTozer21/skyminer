-- 0026 renamed "approved" to "status" but left it a boolean, so the column
-- never adopted the leave_status enum the snapshot already claims it has.
-- Postgres will not cast boolean to enum implicitly, hence the USING clause,
-- and the old default has to go before the type can change.
ALTER TABLE "leave_requests" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "leave_requests" ALTER COLUMN "status" TYPE "public"."leave_status" USING (CASE WHEN "status" THEN 'approved' ELSE 'submitted' END)::"public"."leave_status";--> statement-breakpoint
ALTER TABLE "leave_requests" ALTER COLUMN "status" SET DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE "leave_requests" ALTER COLUMN "status" SET NOT NULL;
