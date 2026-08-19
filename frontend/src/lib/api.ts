import { hc } from 'hono/client';
import type { InferRequestType, InferResponseType } from 'hono/client';
import type { ApiRoutes } from '@server/index';
import { authClient } from '../auth';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await authClient.getSession();
  const token = data?.session?.token;
  if (!token) {
    throw new Error('No active session');
  }
  return { Authorization: `Bearer ${token}` };
}

const client = hc<ApiRoutes>(import.meta.env.VITE_API_URL || 'http://localhost:3000/');

export const api = client.api;

export async function getJobs() {
  const headers = await getAuthHeaders();
  const res = await api.jobs.$get({}, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

export async function getJob(id: number) {
  const headers = await getAuthHeaders();
  const res = await api.jobs[':id'].$get({ param: { id: String(id) } }, { headers });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That job no longer exists'
        : 'There was an error here',
    );
  }
  const { data } = await res.json();
  return data;
}

export async function getCustomers() {
  const headers = await getAuthHeaders();
  const res = await api.customers.$get({}, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }

  const { data } = await res.json();
  return data;
};

export async function getCustomer(id: number) {
  const headers = await getAuthHeaders();
  const res = await api.customers[':id'].$get({ param: { id: String(id) } }, { headers });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That customer no longer exists'
        : 'There was an error here',
    );
  }
  const { data } = await res.json();
  return data;
}

export type CustomerResponse = InferResponseType<typeof api.customers.$get>['data'][number]

export type JobResponse = InferResponseType<typeof api.jobs.$get>['data'][number]

type CreateJobInput = InferRequestType<typeof api.jobs.$post>['json'];

type CreateCustomerInput = InferRequestType<typeof api.customers.$post>['json'];


export async function createJob(job: CreateJobInput) {
  const headers = await getAuthHeaders();
  const res = await api.jobs.$post({ json: job }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  return res.json();
}

type UpdateJobInput = InferRequestType<typeof api.jobs[':id']['$patch']>['json'];

export async function updateJob(id: number, job: UpdateJobInput) {
  const headers = await getAuthHeaders();
  const res = await api.jobs[':id'].$patch({ param: { id: String(id) }, json: job }, { headers });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That job no longer exists'
        : 'There was an error here',
    );
  }
  return res.json();
}

export async function deleteJob(id: number) {
  const headers = await getAuthHeaders();
  const res = await api.jobs[':id'].$delete({ param: { id: String(id) } }, { headers });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That job has already been deleted'
        : 'There was an error here',
    );
  }
  return res.json();
}

export async function createCustomer(customers: CreateCustomerInput) {
  const headers = await getAuthHeaders();
  const res = await api.customers.$post({ json: customers }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  return res.json();
}

export async function deleteCustomer(id: number) {
  const headers = await getAuthHeaders();
  const res = await api.customers[':id'].$delete({ param: { id: String(id) } }, { headers });
  if (!res.ok) {
    throw new Error(
      res.status === 409
        ? 'That customer still has jobs — delete those first'
        : res.status === 404
          ? 'That customer has already been deleted'
          : 'There was an error here',
    );
  }
  return res.json();
}

type CreateLocationInput = InferRequestType<typeof api.locations.$post>['json'];

export async function createLocation(locations: CreateLocationInput) {
  const headers = await getAuthHeaders();
  const res = await api.locations.$post({ json: locations }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  return res.json();
}

// A job with its assignments and the assigned users nested inside.
// Pinned to the 200 response: the path also has a POST whose failure shape has
// no `data`, which would otherwise widen this to `… | undefined`.
export type ScheduleJob = InferResponseType<
  typeof api.admin['job-assignments']['$get'],
  200
>['data'][number]

export async function getJobAssignments(from: string, to: string) {
  const headers = await getAuthHeaders();
  const res = await api.admin['job-assignments'].$get({ query: { from, to } }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

type CreateJobAssignmentInput = InferRequestType<
  typeof api.admin['job-assignments']['$post']
>['json'];

export async function createJobAssignment(assignment: CreateJobAssignmentInput) {
  const headers = await getAuthHeaders();
  const res = await api.admin['job-assignments'].$post({ json: assignment }, { headers });
  if (!res.ok) {
    // 409 is the only failure worth spelling out: the person is already on
    // the job, which the grid can't always show (a cell renders one job).
    throw new Error(
      res.status === 409
        ? 'That person is already assigned to this job'
        : 'There was an error here',
    );
  }
  return res.json();
}

export async function deleteJobAssignment(id: number) {
  const headers = await getAuthHeaders();
  const res = await api.admin['job-assignments'][':id'].$delete(
    { param: { id: String(id) } },
    { headers },
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That assignment has already been removed'
        : 'There was an error here',
    );
  }
  return res.json();
}

export async function listUsers(limit = 100) {
  const { data, error } = await authClient.admin.listUsers({ query: { limit } });
  if (error) throw new Error(error.message);
  return data;
}

// Derived from the call rather than imported from better-auth, which is only a
// transitive dep of @neondatabase/neon-js.
export type AdminUser = NonNullable<
  Awaited<ReturnType<typeof listUsers>>
>['users'][number];

export async function getLeaveRequests() {
  const headers = await getAuthHeaders();
  const res = await api["leave-requests"].$get({}, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}
