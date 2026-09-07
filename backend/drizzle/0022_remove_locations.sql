ALTER TABLE "machines" DROP CONSTRAINT "machines_location_id_fk";
--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "customer_id" bigint;--> statement-breakpoint
UPDATE "machines" SET "customer_id" = "locations"."customer_id" FROM "locations" WHERE "locations"."id" = "machines"."location_id";--> statement-breakpoint
ALTER TABLE "machines" ALTER COLUMN "customer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" DROP COLUMN "location_id";
--> statement-breakpoint
DROP TABLE "locations";
