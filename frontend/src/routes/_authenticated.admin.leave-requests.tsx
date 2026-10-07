import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { openLeaveRequestsQuery, updateLeaveRequestStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import type { LeaveRequestResponse } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/admin/leave-requests')({
  loader: ({ context }) => context.queryClient.ensureQueryData(openLeaveRequestsQuery),
  component: RouteComponent,
})

function RouteComponent() {
  const { data: leave, isPending, error } = useQuery(openLeaveRequestsQuery)

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mt-2 mb-4 flex shrink-0 items-center justify-between gap-3">
        <h1 className="font-bold text-xl">Leave Requests</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <Skeleton className="h-20 w-full max-w-md" />
        ) : error ? (
          <p className="text-muted-foreground text-sm">{error.message}</p>
        ) : leave.length ? (
          <ul className="flex mx-auto max-w-xl flex-col gap-2">
            {leave.map((request) => (
              <li key={request.id}>
                <LeaveRequestItem request={request} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">There are no open leave requests.</p>
        )}
      </div>
    </div>
  )
}

function LeaveRequestItem({
  request,
}: {
  request: LeaveRequestResponse & { user: { id: string; name: string } }
}) {
  const queryClient = useQueryClient()
  const update = useMutation({
    mutationFn: (status: LeaveRequestResponse['status']) =>
      updateLeaveRequestStatus(request.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users', request.user.id] })
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      toast.success('Leave request updated')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-sm px-3 py-2">
      <span className="flex justify-between">
        <span className="font-medium">{request.user.name}</span>
        <span className="text-muted-foreground text-xs md:text-sm">
          {request.startDate === request.endDate
            ? format(new Date(request.startDate), 'dd/MM/yyyy')
            : `${format(new Date(request.startDate), 'dd/MM/yyyy')} – ${format(new Date(request.endDate), 'dd/MM/yyyy')}`}
        </span>
      </span>
        {request.comment ? (
          <span className="text-muted-foreground text-xs">{request.comment}</span>
        ) : null}
      <span className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={update.isPending}
          onClick={() => update.mutate('denied')}
        >
          Deny
        </Button>
        <Button size="sm" disabled={update.isPending} onClick={() => update.mutate('approved')}>
          Approve
        </Button>
      </span>
    </div>
  )
}
