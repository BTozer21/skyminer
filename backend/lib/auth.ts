import { betterAuth } from "better-auth/minimal";
import { admin, jwt } from "better-auth/plugins";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "../src/db/index.ts";
import { schema } from "../src/db/relations.ts";

export const frontendURL = process.env.FRONTEND_URL ?? "http://localhost:5173";

export const backendURL =
  process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const mcpResource =
  process.env.MCP_RESOURCE ?? "http://localhost:3000/mcp";

const crossSiteCookies =
  new URL(frontendURL).hostname !== new URL(backendURL).hostname &&
  backendURL.startsWith("https://");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [
    admin(),
    jwt(),
    mcp({
      loginPage: `${frontendURL}/login`,
      consentPage: `${frontendURL}/consent`,
      resource: mcpResource,
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    defaultCookieAttributes: crossSiteCookies
      ? { sameSite: "none", secure: true }
      : undefined,
  },
  baseURL: backendURL,
  trustedOrigins: [frontendURL],
});
