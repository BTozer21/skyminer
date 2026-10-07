import { Hono } from "hono";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { requireMcpAuth } from "@better-auth/mcp";

import { auth, mcpResource } from "../../lib/auth.ts";
import { db } from "../db/index.ts";

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data) }],
});

const createMcpServer = (userId: string) => {
  const server = new McpServer({ name: "skyminer", version: "0.1.0" });

  server.registerTool(
    "list_my_jobs",
    {
      title: "List my jobs",
      description:
        "List the jobs you are assigned to that are planned or complete, with the customer and machines for each.",
    },
    async () =>
      json(
        await db.query.jobs.findMany({
          where: { status: { ne: "planning" }, jobAssignments: { userId } },
          with: { customer: true, jobMachines: { with: { machine: true } } },
          orderBy: { startDate: "asc" },
        }),
      ),
  );

  server.registerTool(
    "list_my_leave_requests",
    {
      title: "List my leave requests",
      description: "List your leave requests and whether each was approved.",
    },
    async () =>
      json(
        await db.query.leaveRequests.findMany({
          where: { userId },
          orderBy: { startDate: "asc" },
        }),
      ),
  );

  return server;
};

const protectedHandler = requireMcpAuth(
  auth,
  (request, claims) =>
    createMcpHandler(() => createMcpServer(claims.sub!)).fetch(request),
  {
    resource: mcpResource,
  },
);

export const mcpRoute = new Hono().all("/", (c) => protectedHandler(c.req.raw));
