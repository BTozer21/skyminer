ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin-authenticated_backend-policy-all" ON "locations" AS PERMISSIVE FOR ALL TO "authenticated_backend" USING (( SELECT (EXISTS ( SELECT 1
           FROM neon_auth."user" u
          WHERE ((u.id = (auth.user_id())::uuid) AND ('admin'::text = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text)))))) AS "exists")) WITH CHECK (( SELECT (EXISTS ( SELECT 1
           FROM neon_auth."user" u
          WHERE ((u.id = (auth.user_id())::uuid) AND ('admin'::text = ANY (string_to_array(COALESCE(u.role, ''::text), ','::text)))))) AS "exists"));--> statement-breakpoint
CREATE POLICY "crud-authenticated_backend-policy-select" ON "locations" AS PERMISSIVE FOR SELECT TO "authenticated_backend";
