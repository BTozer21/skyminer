import { hc } from 'hono/client';
import type { InferRequestType, InferResponseType } from 'hono/client';
import type { ApiRoutes } from '@server/index';
import { authClient } from '../auth';

const client = hc<ApiRoutes>(import.meta.env.VITE_API_URL || 'http://localhost:3000/', {
  init: { credentials: 'include' },
});

export const api = client.api;

export async function getJobs() {
  const res = await api.jobs.$get();
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

export async function getMyJobs() {
  const res = await api.jobs.mine.$get();
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

// Query options live with the fetcher so a route's loader and its component
// can share one cache entry. The key sits under ['jobs', …] so the
// invalidations the job mutations already fire reach it too.
export const myJobsQuery = {
  queryKey: ['jobs', 'mine'],
  queryFn: getMyJobs,
  staleTime: Infinity,
}

export async function getJob(id: number) {
  const res = await api.jobs[':id'].$get({ param: { id: String(id) } });
  if (!res.ok) {
    // The status rides along so the page can tell "no such job / not yours yet"
    // apart from a request that simply failed.
    throw Object.assign(
      new Error(
        res.status === 404
          ? 'That job no longer exists'
          : 'There was an error here',
      ),
      { status: res.status },
    );
  }
  const { data } = await res.json();
  return data;
}

export async function getCustomers() {
  const res = await api.customers.$get();
  if (!res.ok) {
    throw new Error("There was an error here");
  }

  const { data } = await res.json();
  return data;
};

export async function getCustomer(id: number) {
  const res = await api.customers[':id'].$get({ param: { id: String(id) } });
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

export async function getCustomerMachines(customerId: number) {
  const res = await api.customers[':id'].machines.$get(
    { param: { id: String(customerId) } },
  );
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

export type MachineResponse = InferResponseType<
  typeof api.customers[':id']['machines']['$get'],
  200
>['data'][number]

export type CustomerResponse = InferResponseType<typeof api.customers.$get>['data'][number]

export type JobResponse = InferResponseType<typeof api.jobs.$get, 200>['data'][number]

type CreateJobInput = InferRequestType<typeof api.jobs.$post>['json'];

type CreateCustomerInput = InferRequestType<typeof api.customers.$post>['json'];


export async function createJob(job: CreateJobInput) {
  const res = await api.jobs.$post({ json: job });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

type UpdateJobInput = InferRequestType<typeof api.jobs[':id']['$patch']>['json'];

export async function updateJob(id: number, job: UpdateJobInput) {
  const res = await api.jobs[':id'].$patch({ param: { id: String(id) }, json: job });
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
  const res = await api.jobs[':id'].$delete({ param: { id: String(id) } });
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
  const res = await api.customers.$post({ json: customers });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  return res.json();
}

export async function deleteCustomer(id: number) {
  const res = await api.customers[':id'].$delete({ param: { id: String(id) } });
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

type CreateMachineInput = InferRequestType<typeof api.customers.machine.$post>['json'];

export async function createMachine(machines: CreateMachineInput) {
  const res = await api.customers.machine.$post({ json: machines });
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
  const res = await api.admin['job-assignments'].$get({ query: { from, to } });
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
  const res = await api.admin['job-assignments'].$post({ json: assignment });
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
  const res = await api.admin['job-assignments'][':id'].$delete(
    { param: { id: String(id) } },
  );
  if (!res.ok) {
    if (res.status === 400) {
      const { message } = (await res.json()) as { message: string };
      throw new Error(message);
    }
    throw new Error(
      res.status === 404
        ? 'That assignment has already been removed'
        : 'There was an error here',
    );
  }
  return res.json();
}

export type JobRole = 'member' | 'lead';

export async function updateJobAssignmentRole(id: number, role: JobRole) {
  const res = await api.admin['job-assignments'][':id'].$patch(
    { param: { id: String(id) }, json: { role } },
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

export type AdminUser = NonNullable<
  Awaited<ReturnType<typeof listUsers>>
>['users'][number];

// A team member with their leave requests nested inside. Pinned to 200: the
// 404 branch has no `data`, which would otherwise widen this.
export type TeamMember = InferResponseType<
  typeof api.admin.users[':id']['$get'],
  200
>['data']

export async function getTeamMember(id: string) {
  const res = await api.admin.users[':id'].$get({ param: { id } });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That user no longer exists'
        : 'There was an error here',
    );
  }
  const { data } = await res.json();
  return data;
}

export async function updateLeaveRequestStatus(
  id: number,
  status: LeaveRequestResponse['status'],
) {
  const res = await api.admin['leave-requests'][':id'].$patch(
    { param: { id: String(id) }, json: { status } },
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'That leave request no longer exists'
        : 'There was an error here',
    );
  }
  return res.json();
}

export async function getLeaveRequests() {
  const res = await api["leave-requests"].$get();
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

// Same pattern as myJobsQuery: the loader and the component share one entry.
export type LeaveRequestResponse = InferResponseType<
  typeof api["leave-requests"]["$get"],
  200
>['data'][number]

export const myLeaveQuery = {
  queryKey: ['leave-requests', 'mine'],
  queryFn: getLeaveRequests,
  staleTime: Infinity,
}

type CreateLeaveRequestInput = InferRequestType<
  typeof api["leave-requests"]["$post"]
>['json'];

export async function createLeaveRequest(leave: CreateLeaveRequestInput) {
  const res = await api["leave-requests"].$post({ json: leave });
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

export async function getNotifications() {
  const res = await api.admin.notifications.$get();
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

export const notificationsQuery = {
  queryKey: ['notifications'],
  queryFn: getNotifications,
  refetchInterval: 60_000,
}

export async function getOpenLeaveRequests() {
  const res = await api.admin['leave-requests'].$get();
  if (!res.ok) {
    throw new Error("There was an error here");
  }
  const { data } = await res.json();
  return data;
}

export const openLeaveRequestsQuery = {
  queryKey: ['leave-requests', 'open'],
  queryFn: getOpenLeaveRequests,
}
