import { createMiddleware } from "hono/factory";
import { auth } from "../auth.ts";
import type { AppVariables } from "../../src/types.ts";

export const sessionMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session || session.user.banned) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", session.user.id);
  c.set("userRoles", session.user.role?.split(",") ?? []);

  await next();
});
