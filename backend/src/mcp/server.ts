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
    "list_upcoming_jobs",
    {
      title: "List upcoming jobs",
      description:
        "List planned or complete jobs taking place in the next 14 days, with who is assigned and the customer and their contacts.",
    },
    async () => {
      const today = new Date();
      const inFourteenDays = new Date(today);
      inFourteenDays.setDate(today.getDate() + 14);

      return json(
        await db.query.jobs.findMany({
          where: {
            status: { ne: "planning" },
            startDate: { lte: inFourteenDays.toISOString().slice(0, 10) },
            endDate: { gte: today.toISOString().slice(0, 10) },
          },
          with: {
            customer: { with: { contacts: true } },
            jobAssignments: {
              with: { user: { columns: { id: true, name: true, email: true } } },
            },
          },
          orderBy: { startDate: "asc" },
        }),
      );
    },
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
  async (request, claims) => {
    const user = await db.query.user.findFirst({
      where: { id: claims.sub! },
      columns: { role: true, banned: true },
    });

    if (!user || user.banned || !user.role?.split(",").includes("admin")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return createMcpHandler(() => createMcpServer(claims.sub!)).fetch(request);
  },
  {
    resource: mcpResource,
  },
);

export const mcpRoute = new Hono().all("/", (c) => protectedHandler(c.req.raw));
