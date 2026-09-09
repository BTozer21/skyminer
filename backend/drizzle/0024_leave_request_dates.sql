ALTER TABLE "leave_requests" ALTER COLUMN "approved" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "start_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "end_date" date NOT NULL;