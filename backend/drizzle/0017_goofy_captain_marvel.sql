ALTER TABLE "locations" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER POLICY "crud-authenticated_backend-policy-select" ON "locations" TO authenticated_backend;