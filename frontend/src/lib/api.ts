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

export async function getClients() {
  const headers = await getAuthHeaders();
  const res = await api.clients.$get({}, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }

  const { data } = await res.json();
  return data;
};

export type ClientResponse = InferResponseType<typeof api.clients.$get>['data'][number]

export type JobResponse = InferResponseType<typeof api.jobs.$get>['data'][number]

type CreateJobInput = InferRequestType<typeof api.jobs.$post>['json'];

type CreateClientInput = InferRequestType<typeof api.clients.$post>['json'];

export async function createJob(job: CreateJobInput) {
  const headers = await getAuthHeaders();
  const res = await api.jobs.$post({ json: job }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  return res.json();
}

export async function createClient(clients: CreateClientInput) {
  const headers = await getAuthHeaders();
  const res = await api.clients.$post({ json: clients }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  return res.json();
}

export async function getJobAssignments(from: string, to: string) {
  const headers = await getAuthHeaders();
  const res = await api.admin['job-assignments'].$get({ query: { from, to } }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
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
