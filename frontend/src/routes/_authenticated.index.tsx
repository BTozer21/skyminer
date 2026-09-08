import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { authClient, useIsAdmin } from '../auth';
import { myJobsQuery } from '@/lib/api'
import { STATUS_CONFIG } from '@/lib/v1/jobs'
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
  loader: ({ context }) => context.queryClient.ensureQueryData(myJobsQuery),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const { isAdmin, isPending } = useIsAdmin();
  const { data: jobs, isPending: jobsPending } = useQuery(myJobsQuery);

  return (
    <div className="flex flex-col px-5">
      <div className="flex gap-2">
        <p className="font-bold text-xl">Hello there, {session?.user.name}</p>
      </div>
      {!isAdmin && !isPending &&
        <div className="flex flex-col gap-2">
          <h2 className="mt-4 font-medium">Your jobs</h2>
          {jobsPending ? (
            <Skeleton className="h-14 w-full max-w-md" />
          ) : jobs?.length ? (
            <ul className="flex max-w-md flex-col gap-2">
              {jobs.map((job) => {
                const status = STATUS_CONFIG[job.status];
                const StatusIcon = status.icon;

                return (
                  <li key={job.id}>
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: String(job.id) }}
                      className="bg-muted/40 flex items-center justify-between gap-3 rounded-sm border border-transparent px-3 py-2 transition-all duration-200 hover:!border-blue-500"
                    >
                      <span className="flex flex-col">
                        <span className="font-medium">{job.name}</span>
                        <span className="text-muted-foreground text-xs">{job.customer.name}</span>
                      </span>
                      <span className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {/* Single-day jobs read as one date, not "5 Mar – 5 Mar". */}
                          {job.startDate === job.endDate
                            ? format(new Date(job.endDate), 'dd/MM/yyyy')
                            : `${format(new Date(job.startDate), 'dd/MM/yyyy')} – ${format(new Date(job.endDate), 'dd/MM/yyyy')}`}
                        </span>
                        <StatusIcon className={`size-4 shrink-0 ${status.className}`} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">You have no jobs scheduled.</p>
          )}
        </div>
      }
      {isAdmin && !isPending &&
        <div>
          <p>You are seeing this as an admin user.</p>
        </div>
      }
    </div>
  )
}

