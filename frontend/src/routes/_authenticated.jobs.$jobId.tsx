import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Crown } from 'lucide-react'

import { getJob } from '@/lib/api'
import { STATUS_CONFIG } from '@/lib/v1/jobs'
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Shared by the loader and the component so both read the same cache entry.
const jobQuery = (jobId: string) => ({
  queryKey: ['jobs', jobId],
  queryFn: () => getJob(Number(jobId)),
  staleTime: Infinity,
  // A 404 is an answer, not a failure — retrying it just delays the not-found
  // screen by a few seconds.
  retry: (count: number, error: Error) =>
    (error as { status?: number }).status !== 404 && count < 3,
})

export const Route = createFileRoute('/_authenticated/jobs/$jobId')({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(jobQuery(params.jobId))
    } catch (error) {
      // Someone else's job, and one that isn't planned yet, are both 404s —
      // the server won't say which, so neither does the screen below.
      if ((error as { status?: number }).status === 404) throw notFound()
      throw error
    }
  },
  component: RouteComponent,
  notFoundComponent: JobNotFound,
})

function JobNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="text-xl font-bold">Job not found</h1>
      <p className="text-muted-foreground text-sm">
        Either it doesn&apos;t exist, or it is not ready for viewing yet.
      </p>
      <Button asChild>
        <Link to="/">Return home</Link>
      </Button>
    </div>
  )
}

function RouteComponent() {
  const { jobId } = Route.useParams()
  // The loader has already put this in the cache; useQuery keeps the page live
  // if it's invalidated later.
  const { data: job, isPending, isError } = useQuery(jobQuery(jobId))

  // The team rides along with the job — the endpoint only returns it to admins
  // and to people on the job themselves.
  const team = job?.jobAssignments ?? []

  const status = job ? STATUS_CONFIG[job.status] : null
  const StatusIcon = status?.icon

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        <h1 className="font-bold text-xl">
          {isPending ? <Skeleton className="h-7 w-48" /> : job?.name}
        </h1>
      </div>

      {isError ? (
        <p className="text-destructive">Could not load this job.</p>
      ) : (
        <dl className="grid max-w-md grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{isPending ? <Skeleton className="h-5 w-40" /> : job?.customer?.name ?? '-'}</dd>

          <dt className="text-muted-foreground">Status</dt>
          <dd>
            {isPending || !status ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <span className={`flex items-center gap-2 capitalize ${status.className}`}>
                {StatusIcon && <StatusIcon className="size-4 shrink-0" />}
                {job.status}
              </span>
            )}
          </dd>

          <dt className="text-muted-foreground">Start Date</dt>
          <dd>
            {isPending
              ? <Skeleton className="h-5 w-32" />
              : job?.startDate ? format(new Date(job.startDate), 'EEE d MMM yy') : '-'}
          </dd>

          <dt className="text-muted-foreground">End Date</dt>
          <dd>
            {isPending
              ? <Skeleton className="h-5 w-32" />
              : job?.endDate ? format(new Date(job.endDate), 'EEE d MMM yy') : '-'}
          </dd>
        </dl>
      )}

      <h2 className="mt-6 mb-2 font-medium">Team</h2>
      {isPending ? (
        <Skeleton className="h-5 w-40" />
      ) : team.length ? (
        <ul className="flex max-w-md flex-col gap-1 text-sm">
          {team.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              {/* The crown marks the lead; members get an empty slot the same
                  width so the names stay in one column. */}
              {member.role === 'lead' ? (
                <Crown className="size-4 shrink-0 fill-amber-400 text-amber-500" />
              ) : (
                <span className="size-4 shrink-0" />
              )}
              <span>{member.userInNeonAuth.name}</span>
              <span className="text-muted-foreground text-xs">
                {member.userInNeonAuth.email}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No one is assigned to this job.</p>
      )}
    </div>
  )
}
