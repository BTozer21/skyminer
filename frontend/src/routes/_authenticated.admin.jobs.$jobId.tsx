import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { getJob } from '@/lib/api'
import { STATUS_CONFIG } from '@/lib/v1/jobs'

export const Route = createFileRoute('/_authenticated/admin/jobs/$jobId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { jobId } = Route.useParams()
  const { data: job, isPending, isError } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => getJob(Number(jobId)),
  })

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        <h1 className="font-bold text-xl">{job ? job.name : 'Job'}</h1>
      </div>

      {isPending && <p>Loading job…</p>}
      {isError && <p className="text-destructive">Could not load this job.</p>}

      {job && (() => {
        const { icon: StatusIcon, className: statusClassName } = STATUS_CONFIG[job.status]

        return (
        <dl className="grid max-w-md grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Client</dt>
          <dd>{job.client?.name ?? '-'}</dd>

          <dt className="text-muted-foreground">Status</dt>
          <dd className={`flex items-center gap-2 capitalize ${statusClassName}`}>
            <StatusIcon className="size-4 shrink-0" />
            {job.status}
          </dd>

          <dt className="text-muted-foreground">Start Date</dt>
          <dd>{job.startDate ? format(new Date(job.startDate), 'EEE d MMM yy') : '-'}</dd>

          <dt className="text-muted-foreground">End Date</dt>
          <dd>{job.endDate ? format(new Date(job.endDate), 'EEE d MMM yy') : '-'}</dd>
        </dl>
        )
      })()}
    </div>
  )
}
