ALTER TABLE "job_machines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "machines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin-authenticated_backend-policy-all" ON "job_machines" AS PERMISSIVE FOR ALL TO "authenticated_backend" USING (( SELECT (EXISTS ( SELECT 1
           FROM neon_auth."user" u
          WHERE ((u.id = (auth.user_id())::uuid) AND ('admin'::text = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text)))))) AS "exists")) WITH CHECK (( SELECT (EXISTS ( SELECT 1
           FROM neon_auth."user" u
          WHERE ((u.id = (auth.user_id())::uuid) AND ('admin'::text = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text)))))) AS "exists"));--> statement-breakpoint
CREATE POLICY "crud-authenticated_backend-policy-select" ON "job_machines" AS PERMISSIVE FOR SELECT TO "authenticated_backend";--> statement-breakpoint
CREATE POLICY "admin-authenticated_backend-policy-all" ON "machines" AS PERMISSIVE FOR ALL TO "authenticated_backend" USING (( SELECT (EXISTS ( SELECT 1
           FROM neon_auth."user" u
          WHERE ((u.id = (auth.user_id())::uuid) AND ('admin'::text = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text)))))) AS "exists")) WITH CHECK (( SELECT (EXISTS ( SELECT 1
           FROM neon_auth."user" u
          WHERE ((u.id = (auth.user_id())::uuid) AND ('admin'::text = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text)))))) AS "exists"));--> statement-breakpoint
CREATE POLICY "crud-authenticated_backend-policy-select" ON "machines" AS PERMISSIVE FOR SELECT TO "authenticated_backend";