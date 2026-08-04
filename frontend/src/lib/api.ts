import { hc } from 'hono/client';
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

const client = hc<ApiRoutes>('http://localhost:3000/');

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

export async function createJob(job: { name: string; startDate: string; endDate: string }) {
  const headers = await getAuthHeaders();
  const res = await api.jobs.$post({ json: job }, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  return res.json();
}

export async function getLeaveRequests() {
  const headers = await getAuthHeaders();
  const res = await api["leave-requests"].$get({}, { headers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}
