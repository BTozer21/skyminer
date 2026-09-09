ALTER TABLE "job_machines" DROP CONSTRAINT "job_machines_job_id_fk";
--> statement-breakpoint
ALTER TABLE "job_machines" DROP CONSTRAINT "job_machines_machine_id_fk";
--> statement-breakpoint
ALTER TABLE "machines" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "job_machines" ADD CONSTRAINT "job_machines_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_machines" ADD CONSTRAINT "job_machines_machine_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "job_machines" ADD CONSTRAINT "job_machines_job_id_machine_id_unique" UNIQUE("job_id","machine_id");