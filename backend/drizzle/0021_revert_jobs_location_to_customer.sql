ALTER TABLE "jobs" DROP CONSTRAINT "jobs_location_id_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "customer_id" bigint;--> statement-breakpoint
UPDATE "jobs" SET "customer_id" = "locations"."customer_id" FROM "locations" WHERE "locations"."id" = "jobs"."location_id";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "customer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN "location_id";
