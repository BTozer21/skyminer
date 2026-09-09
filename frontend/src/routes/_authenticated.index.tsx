import { useMemo } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { authClient, useIsAdmin } from '../auth';
import { myJobsQuery, myLeaveQuery } from '@/lib/api'
import { STATUS_CONFIG, STATUSES } from '@/lib/v1/jobs'
import { MemberCalendar, parseDay } from '@/components/calendars/v1/member-calendar'
import type { CalendarEvent } from '@/components/calendars/v1/member-calendar'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/')({
  // Admins land on the schedule instead of the personal home page. The mirror
  // of the /admin guard, which sends non-admins here — the two conditions are
  // opposites, so they can't bounce off each other. beforeLoad runs outside
  // React, so we read the session directly instead of using useIsAdmin.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (data?.user.role?.split(',').includes('admin')) {
      throw redirect({ to: '/admin' });
    }
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(myJobsQuery),
      context.queryClient.ensureQueryData(myLeaveQuery),
    ]),
  component: RouteComponent,
})

// Leave is only ever one of two states, so it gets a flat map rather than the
// config object the job statuses need.
const LEAVE_BAR = {
  approved: 'bg-violet-500/25 text-violet-900 dark:text-violet-100',
  pending: 'border border-dashed border-violet-500/60 bg-violet-500/10 text-violet-900 dark:text-violet-100',
} as const

function RouteComponent() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { isAdmin, isPending } = useIsAdmin();
  const { data: jobs, isPending: jobsPending } = useQuery(myJobsQuery);
  const { data: leave, isPending: leavePending } = useQuery(myLeaveQuery);

  const events = useMemo<Array<CalendarEvent>>(() => {
    const jobEvents = (jobs ?? []).map((job) => ({
      id: `job-${job.id}`,
      title: job.name,
      subtitle: job.customer.name,
      start: parseDay(job.startDate),
      end: parseDay(job.endDate),
      className: STATUS_CONFIG[job.status].bar,
      onClick: () => navigate({ to: '/jobs/$jobId', params: { jobId: String(job.id) } }),
    }));

    const leaveEvents = (leave ?? []).map((request) => ({
      id: `leave-${request.id}`,
      title: 'Leave',
      subtitle: request.approved ? undefined : 'pending',
      start: parseDay(request.startDate),
      end: parseDay(request.endDate),
      className: request.approved ? LEAVE_BAR.approved : LEAVE_BAR.pending,
    }));

    return [...jobEvents, ...leaveEvents];
  }, [jobs, leave, navigate]);

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      {!isAdmin && !isPending &&
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
          {jobsPending || leavePending ? (
            <Skeleton className="min-h-0 w-full flex-1" />
          ) : (
            <MemberCalendar
              events={events}
              legend={
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  {STATUSES.map((status) => (
                    <span key={status} className="flex items-center gap-1.5">
                      <span className={`size-3 rounded-sm ${STATUS_CONFIG[status].bar}`} />
                      {STATUS_CONFIG[status].label}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5">
                    <span className={`size-3 rounded-sm ${LEAVE_BAR.approved}`} />
                    Leave
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`size-3 rounded-sm ${LEAVE_BAR.pending}`} />
                    Leave (pending)
                  </span>
                </div>
              }
            />
          )}
          {!events.length && !jobsPending && !leavePending && (
            <p className="text-muted-foreground text-sm">You have no jobs scheduled.</p>
          )}
        </div>
      }
    </div>
  )
}
