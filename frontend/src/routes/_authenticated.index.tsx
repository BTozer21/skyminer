import { useMemo } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { authClient, useIsAdmin } from '../auth';
import { myJobsQuery, myLeaveQuery } from '@/lib/api'
import { STATUS_CONFIG, jobTitle } from '@/lib/v1/jobs'
import { LEAVE_STATUS_CONFIG } from '@/lib/v1/leave'
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

function RouteComponent() {
  const navigate = useNavigate();
  const { isAdmin, isPending } = useIsAdmin();
  const { data: jobs, isPending: jobsPending } = useQuery(myJobsQuery);
  const { data: leave, isPending: leavePending } = useQuery(myLeaveQuery);

  const events = useMemo<Array<CalendarEvent>>(() => {
    const jobEvents = (jobs ?? []).map((job) => ({
      id: `job-${job.id}`,
      title: jobTitle(job),
      subtitle: job.customer.name,
      start: parseDay(job.startDate),
      end: parseDay(job.endDate),
      className: STATUS_CONFIG[job.status].bar,
      onClick: () => navigate({ to: '/jobs/$jobId', params: { jobId: String(job.id) } }),
    }));

    // Denied leave is not time off, so it never reaches the calendar.
    const leaveEvents = (leave ?? [])
      .filter((request) => request.status !== 'denied')
      .map((request) => ({
        id: `leave-${request.id}`,
        title: 'Leave',
        subtitle: request.status === 'submitted' ? 'pending' : undefined,
        start: parseDay(request.startDate),
        end: parseDay(request.endDate),
        className: LEAVE_STATUS_CONFIG[request.status].bar,
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
                  <span className="flex items-center gap-1.5">
                    <span className={`size-3 rounded-sm ${STATUS_CONFIG.planned.bar}`} />
                    Jobs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`size-3 rounded-sm ${LEAVE_STATUS_CONFIG.approved.bar}`} />
                    Leave
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`size-3 rounded-sm ${LEAVE_STATUS_CONFIG.submitted.bar}`} />
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
