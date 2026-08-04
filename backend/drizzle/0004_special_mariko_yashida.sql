ALTER TABLE "jobs" ADD COLUMN "startDate" date NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "endDate" date NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE POLICY "admin-authenticated_backend-policy-all" ON "jobs" AS PERMISSIVE FOR ALL TO "authenticated_backend" USING (( SELECT EXISTS ( SELECT 1 FROM neon_auth."user" u WHERE ((u.id = (auth.user_id())::uuid) AND ('admin' = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text))))))) WITH CHECK (( SELECT EXISTS ( SELECT 1 FROM neon_auth."user" u WHERE ((u.id = (auth.user_id())::uuid) AND ('admin' = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text)))))));--> statement-breakpoint
