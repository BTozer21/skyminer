import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { getJob } from '@/lib/api'
import { STATUS_CONFIG } from '@/lib/v1/jobs'
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_authenticated/admin/jobs/$jobId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { jobId } = Route.useParams()
  const { data: job, isPending, isError } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => getJob(Number(jobId)),
  })

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
          <dt className="text-muted-foreground">Client</dt>
          <dd>{isPending ? <Skeleton className="h-5 w-40" /> : job?.client?.name ?? '-'}</dd>

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
    </div>
  )
}
