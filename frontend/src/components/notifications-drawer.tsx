import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

import { notificationsQuery, updateLeaveRequestStatus } from '@/lib/api'
import { jobTitle } from '@/lib/v1/jobs'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'

import type { LeaveRequestResponse } from '@/lib/api'

export function NotificationsDrawer() {
  const { data, isPending, error } = useQuery(notificationsQuery)
  const count = data
    ? data.leaveRequests.length + data.upcomingJobs.length + data.finishedJobs.length
    : 0

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {count > 0 ? (
            <span className="bg-destructive absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white">
              {count}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Notifications</DrawerTitle>
          <DrawerDescription>
            {count ? `${count} thing${count === 1 ? '' : 's'} need attention` : 'Nothing needs attention'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          {isPending ? (
            <Skeleton className="h-14 w-full" />
          ) : error ? (
            <p className="text-muted-foreground">{error.message}</p>
          ) : (
            <>
              {data.leaveRequests.length ? (
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium">Leave requests</h3>
                  {data.leaveRequests.map((request) => (
                    <LeaveRequestItem key={request.id} request={request} />
                  ))}
                </section>
              ) : null}

              {data.upcomingJobs.length ? (
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium">Coming up</h3>
                  {data.upcomingJobs.map((job) => (
                    <JobItem
                      key={job.id}
                      job={job}
                      when={`Starts ${format(new Date(job.startDate), 'dd/MM/yyyy')}`}
                      missing={[
                        !job.quote && 'Quote',
                        !job.rams && 'RAMS',
                        !job.po && 'PO',
                      ]}
                    />
                  ))}
                </section>
              ) : null}

              {data.finishedJobs.length ? (
                <section className="flex flex-col gap-2">
                  <h3 className="font-medium">Needs wrapping up</h3>
                  {data.finishedJobs.map((job) => (
                    <JobItem
                      key={job.id}
                      job={job}
                      when={`Ended ${format(new Date(job.endDate), 'dd/MM/yyyy')}`}
                      missing={[!job.report && 'Report', !job.invoice && 'Invoice']}
                    />
                  ))}
                </section>
              ) : null}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function JobItem({
  job,
  when,
  missing,
}: {
  job: Parameters<typeof jobTitle>[0] & { id: number }
  when: string
  missing: (string | false)[]
}) {
  return (
    <DrawerClose asChild>
      <Link
        to="/jobs/$jobId"
        params={{ jobId: String(job.id) }}
        className="bg-muted/40 hover:bg-muted flex flex-col rounded-sm px-3 py-2"
      >
        <span className="font-medium">{jobTitle(job)}</span>
        <span className="text-muted-foreground text-xs">
          {when} · Missing {missing.filter(Boolean).join(', ')}
        </span>
      </Link>
    </DrawerClose>
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
      <span className="flex flex-col">
        <span className="font-medium">{request.user.name}</span>
        <span className="text-muted-foreground text-xs">
          {request.startDate === request.endDate
            ? format(new Date(request.startDate), 'dd/MM/yyyy')
            : `${format(new Date(request.startDate), 'dd/MM/yyyy')} – ${format(new Date(request.endDate), 'dd/MM/yyyy')}`}
        </span>
        {request.comment ? (
          <span className="text-muted-foreground text-xs">{request.comment}</span>
        ) : null}
      </span>
      <span className="flex gap-2">
        <Button size="sm" disabled={update.isPending} onClick={() => update.mutate('approved')}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={update.isPending}
          onClick={() => update.mutate('denied')}
        >
          Deny
        </Button>
      </span>
    </div>
  )
}
