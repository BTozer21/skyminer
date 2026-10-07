CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TYPE "customer_type" AS ENUM('school', 'industrial');--> statement-breakpoint
CREATE TYPE "leave_status" AS ENUM('submitted', 'approved', 'denied');--> statement-breakpoint
CREATE TYPE "status" AS ENUM('complete', 'planned', 'planning');--> statement-breakpoint
CREATE TABLE "auth"."account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."jwks" (
	"id" text PRIMARY KEY,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp,
	"alg" text,
	"crv" text
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_access_token" (
	"id" text PRIMARY KEY,
	"token" text NOT NULL UNIQUE,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"refresh_id" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"revoked" timestamp,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_client" (
	"id" text PRIMARY KEY,
	"client_id" text NOT NULL UNIQUE,
	"client_secret" text,
	"client_discovery_id" text,
	"disabled" boolean DEFAULT false,
	"skip_consent" boolean,
	"enable_end_session" boolean,
	"subject_type" text,
	"scopes" text[],
	"client_credentials_scopes" text[] DEFAULT '{}'::text[],
	"user_id" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" text[],
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" text[] NOT NULL,
	"post_logout_redirect_uris" text[],
	"backchannel_logout_uri" text,
	"backchannel_logout_session_required" boolean,
	"token_endpoint_auth_method" text,
	"application_type" text,
	"jwks" text,
	"jwks_uri" text,
	"grant_types" text[],
	"response_types" text[],
	"require_pkce" boolean,
	"dpop_bound_access_tokens" boolean DEFAULT false,
	"reference_id" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_client_assertion" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_client_resource" (
	"id" text PRIMARY KEY,
	"client_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_consent" (
	"id" text PRIMARY KEY,
	"client_id" text NOT NULL,
	"user_id" text,
	"reference_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"scopes" text[] NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_refresh_token" (
	"id" text PRIMARY KEY,
	"token" text NOT NULL UNIQUE,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"revoked" timestamp,
	"rotated_at" timestamp,
	"rotation_replay_response" text,
	"rotation_replay_expires_at" timestamp,
	"auth_time" timestamp,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."oauth_resource" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"access_token_ttl" integer,
	"refresh_token_ttl" integer,
	"signing_algorithm" text,
	"signing_key_id" text,
	"allowed_scopes" text[],
	"custom_claims" jsonb,
	"dpop_bound_access_tokens_required" boolean DEFAULT false,
	"disabled" boolean DEFAULT false,
	"created_at" timestamp,
	"updated_at" timestamp,
	"policy_version" integer DEFAULT 1,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "auth"."session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "auth"."user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"type" "customer_type" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_assignments" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "job_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"jobId" bigint NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "job_assignments_user_id_job_id_unique" UNIQUE("user_id","jobId")
);
--> statement-breakpoint
CREATE TABLE "job_machines" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "job_machines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"job_id" bigint NOT NULL,
	"machine_id" bigint NOT NULL,
	CONSTRAINT "job_machines_job_id_machine_id_unique" UNIQUE("job_id","machine_id")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "jobs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"startDate" date NOT NULL,
	"endDate" date NOT NULL,
	"status" "status" DEFAULT 'planning'::"status" NOT NULL,
	"quote" boolean DEFAULT false,
	"rams" boolean DEFAULT false,
	"po" boolean DEFAULT false,
	"report" boolean DEFAULT false,
	"invoice" boolean DEFAULT false,
	"hotel" boolean DEFAULT false,
	"customer_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "leave_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"comment" text,
	"status" "leave_status" DEFAULT 'submitted'::"leave_status" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "machines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"location" text,
	"customer_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth"."account" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_clientId_idx" ON "auth"."oauth_access_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_sessionId_idx" ON "auth"."oauth_access_token" ("session_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_userId_idx" ON "auth"."oauth_access_token" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_authorizationCodeId_idx" ON "auth"."oauth_access_token" ("authorization_code_id");--> statement-breakpoint
CREATE INDEX "oauthAccessToken_refreshId_idx" ON "auth"."oauth_access_token" ("refresh_id");--> statement-breakpoint
CREATE INDEX "oauthClient_userId_idx" ON "auth"."oauth_client" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauthClientResource_clientId_resourceId_uidx" ON "auth"."oauth_client_resource" ("client_id","resource_id");--> statement-breakpoint
CREATE INDEX "oauthClientResource_clientId_idx" ON "auth"."oauth_client_resource" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthClientResource_resourceId_idx" ON "auth"."oauth_client_resource" ("resource_id");--> statement-breakpoint
CREATE INDEX "oauthConsent_clientId_idx" ON "auth"."oauth_consent" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthConsent_userId_idx" ON "auth"."oauth_consent" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_clientId_idx" ON "auth"."oauth_refresh_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_sessionId_idx" ON "auth"."oauth_refresh_token" ("session_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_userId_idx" ON "auth"."oauth_refresh_token" ("user_id");--> statement-breakpoint
CREATE INDEX "oauthRefreshToken_authorizationCodeId_idx" ON "auth"."oauth_refresh_token" ("authorization_code_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth"."session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth"."verification" ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "job_assignments_one_lead_per_job" ON "job_assignments" ("jobId") WHERE role = 'lead';--> statement-breakpoint
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fkey" FOREIGN KEY ("refresh_id") REFERENCES "auth"."oauth_refresh_token"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_dn2L1gs9Dolm_fkey" FOREIGN KEY ("resource_id") REFERENCES "auth"."oauth_resource"("identifier") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "auth"."oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id");--> statement-breakpoint
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_job_id_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_machines" ADD CONSTRAINT "job_machines_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "job_machines" ADD CONSTRAINT "job_machines_machine_id_fk" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id");--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");