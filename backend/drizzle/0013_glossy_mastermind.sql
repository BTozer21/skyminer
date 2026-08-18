ALTER TABLE "clients" RENAME TO "customers";--> statement-breakpoint
ALTER TABLE "jobs" RENAME COLUMN "client_id" TO "customer_id";--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;