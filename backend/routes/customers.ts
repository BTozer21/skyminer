import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../src/db/index.ts';
import { customerContacts, customers, jobs, machines } from '../src/db/schema/public.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-orm/zod';
import type { AppVariables } from '../src/types.ts';

const createCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  type: true,
});

const createMachineSchema = createInsertSchema(machines).pick({
  type: true,
  location: true,
  customerId: true,
});

const createContactSchema = createInsertSchema(customerContacts).pick({
  name: true,
  phoneNo: true,
  email: true,
}).extend({
  name: z.string().trim().min(1),
  phoneNo: z.string().trim().min(1),
  email: z.email().nullish(),
});

export const customersRoute = new Hono<{ Variables: AppVariables }>()
.get('/', async(c) => {
  const allCustomers = await db.select().from(customers);

  return c.json({ data: allCustomers }, 200)
})

.post('/', zValidator('json', createCustomerSchema), async(c) => {
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const body = c.req.valid('json');

  await db.insert(customers).values(body);

  return c.json({ message: "Uploaded" }, 201);
})

.get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async(c) => {
  const { id } = c.req.valid('param');

  const customer = await db.query.customers.findFirst({
    where: { id },
    with: { machines: true },
  });

  if (!customer) {
    return c.json({ message: "Customer not found" }, 404);
  }

  return c.json({ data: customer }, 200);
})


.get('/:id/machines', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async(c) => {
  const { id } = c.req.valid('param');

  const customerMachines = await db
    .select()
    .from(machines)
    .where(eq(machines.customerId, id))
    .orderBy(machines.type, machines.location);

  return c.json({ data: customerMachines }, 200);
})

.delete('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async(c) => {
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const { id } = c.req.valid('param');

  const result = await db.transaction(async (tx) => {
    // Deleting a customer doesn't cascade to its jobs, which would silently
    // take everyone scheduled on them with it. Say so instead and let the
    // admin clear the jobs first.
    const [job] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.customerId, id))
      .limit(1);
    if (job) return { blocked: true as const };

    const [deleted] = await tx.delete(customers).where(eq(customers.id, id)).returning();

    return { blocked: false as const, deleted };
  });

  if (result.blocked) {
    return c.json({ message: "This customer still has jobs" }, 409);
  }

  if (!result.deleted) {
    return c.json({ message: "Customer not found" }, 404);
  }

  return c.json({ data: result.deleted }, 200);
})

.post('/machine', zValidator('json', createMachineSchema), async (c) => {
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const body = c.req.valid('json');

  await db.insert(machines).values(body);

  return c.json({ message: "Uploaded" }, 201);
})

.get('/:id/contacts', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const { id } = c.req.valid('param');

  const contacts = await db.query.customerContacts.findMany({
    where: { customerId: id },
    orderBy: { name: 'asc' },
  });

  return c.json({ data: contacts }, 200);
})

.post(
  '/:id/contacts',
  zValidator('param', z.object({ id: z.coerce.number().int().positive() })),
  zValidator('json', createContactSchema),
  async (c) => {
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const customer = await db.query.customers.findFirst({ where: { id }, columns: { id: true } });
    if (!customer) {
      return c.json({ message: "Customer not found" }, 404);
    }

    const [contact] = await db
      .insert(customerContacts)
      .values({ ...body, customerId: id })
      .returning();

    return c.json({ data: contact }, 201);
  }
)

.delete(
  '/contacts/:contactId',
  zValidator('param', z.object({ contactId: z.coerce.number().int().positive() })),
  async (c) => {
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const { contactId } = c.req.valid('param');

    const [deleted] = await db
      .delete(customerContacts)
      .where(eq(customerContacts.id, contactId))
      .returning();

    if (!deleted) {
      return c.json({ message: "Contact not found" }, 404);
    }

    return c.json({ data: deleted }, 200);
  }
)
