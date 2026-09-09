import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { CheckCircle2, CircleDashed } from 'lucide-react'

import { myLeaveQuery } from '@/lib/api'
import { CreateLeaveRequestForm } from '@/components/forms/v1/create-leave-request-form'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/leave-requests')({
  loader: ({ context }) => context.queryClient.ensureQueryData(myLeaveQuery),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: leave, isPending } = useQuery(myLeaveQuery);

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mt-2 mb-4 flex shrink-0 items-center justify-between gap-3">
        <h1 className="font-bold text-xl">Leave Requests</h1>
        <CreateLeaveRequestForm />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <Skeleton className="h-14 w-full max-w-md" />
        ) : leave?.length ? (
          <ul className="flex max-w-md flex-col gap-2">
            {leave.map((request) => {
              const StatusIcon = request.approved ? CheckCircle2 : CircleDashed;

              return (
                <li
                  key={request.id}
                  className="bg-muted/40 flex items-start justify-between gap-3 rounded-sm px-3 py-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      {/* A single day reads as one date, not "5 Mar – 5 Mar". */}
                      {request.startDate === request.endDate
                        ? format(new Date(request.startDate), 'dd/MM/yyyy')
                        : `${format(new Date(request.startDate), 'dd/MM/yyyy')} – ${format(new Date(request.endDate), 'dd/MM/yyyy')}`}
                    </span>
                    {request.comment ? (
                      <span className="text-muted-foreground text-xs">{request.comment}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {request.approved ? 'Approved' : 'Pending'}
                    </span>
                    <StatusIcon
                      className={`size-4 shrink-0 ${request.approved ? 'text-green-500' : 'text-amber-500'}`}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            You have no leave requests. Use the + button to request time off.
          </p>
        )}
      </div>
    </div>
  )
}
