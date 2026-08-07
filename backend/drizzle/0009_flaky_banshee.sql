ALTER TABLE "job_assignments" DROP CONSTRAINT "job_assignments_job_id_job_id_fk";
--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_job_id_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
