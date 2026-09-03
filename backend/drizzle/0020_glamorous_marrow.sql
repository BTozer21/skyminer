CREATE TYPE "public"."customer_type" AS ENUM('school', 'industrial');--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "type" "customer_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "hotel" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "location_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "customer_id";