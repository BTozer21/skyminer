import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CalendarIcon, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { deleteJob, updateJob } from '@/lib/api';
import { STATUS_CONFIG, STATUSES } from '@/lib/v1/jobs';

import type { DataTableFeatures } from '../data-table-features.ts';
import type { JobResponse } from '@/lib/api';


const columnHelper = createColumnHelper<DataTableFeatures, JobResponse>()

export const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
    size: 240,
    cell: ({ row }) => {
      const job = row.original

      return (
        <Link
          to="/admin/jobs/$jobId"
          params={{ jobId: String(job.id) }}
          className="font-medium hover:underline"
        >
          {job.name}
        </Link>
      )
    }
  }),
  columnHelper.accessor("client.name", {
    id: "client",
    header: "Client",
    size: 180,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    size: 140,
    cell: ({ row }) => {
      const job = row.original
      const { icon: StatusIcon, className: statusClassName, hover: statusHover } = STATUS_CONFIG[job.status]

      // Hooks are fine here: flexRender renders `cell` as a component.
      const queryClient = useQueryClient()
      const update = useMutation({
        mutationFn: (status: JobResponse['status']) => updateJob(job.id, { status }),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] })
          toast.success('Status updated')
        },
        onError: (error) => {
          toast.error(error.message)
        },
      })

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={update.isPending}
              className={`capitalize -m-2 ${statusClassName} ${statusHover} rounded-sm flex items-center gap-2 w-fit p-2 text-left disabled:opacity-50`}
            >
              <StatusIcon className="size-4 shrink-0" />
              {job.status}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUSES.map((status) => {
              const { icon: Icon, className, hover, focus } = STATUS_CONFIG[status]

              return (
                <DropdownMenuItem
                  key={status}
                  className={`capitalize hover:cursor-pointer gap-2 ${hover} ${focus}`}
                  onClick={() => update.mutate(status)}
                >
                  <Icon className={`size-4 ${className}`} />
                  {status}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }),
  columnHelper.display({
    id: "dates",
    header: "Dates",
    size: 240,
    cell: ({ row }) => {
      const job = row.original

      const current: DateRange | undefined = job.startDate
        ? { from: new Date(job.startDate), to: job.endDate ? new Date(job.endDate) : undefined }
        : undefined

      // Hooks are fine here: flexRender renders `cell` as a component.
      const queryClient = useQueryClient()
      const [open, setOpen] = useState(false)
      const [draft, setDraft] = useState<DateRange | undefined>(current)
      const update = useMutation({
        mutationFn: (range: { startDate: string; endDate: string }) => updateJob(job.id, range),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] })
          setOpen(false)
          toast.success('Dates updated')
        },
        onError: (error) => {
          toast.error(error.message)
        },
      })

      return (
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (next) setDraft(current)
          }}
        >
          <PopoverTrigger asChild>
            <button
              className="-m-2 flex w-fit items-center gap-2 rounded-sm p-2 text-left hover:bg-muted"
            >
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              {current?.from ? (
                current.to ? (
                  <>{format(current.from, 'd MMM yy')} – {format(current.to, 'd MMM yy')}</>
                ) : (
                  format(current.from, 'd MMM yy')
                )
              ) : (
                <span className="text-muted-foreground">Set dates</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={draft?.from}
              selected={draft}
              onSelect={setDraft}
              numberOfMonths={2}
            />
            <div className="flex justify-end gap-2 border-t p-3">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!draft?.from || !draft?.to || update.isPending}
                onClick={() => {
                  if (draft?.from && draft?.to) {
                    update.mutate({
                      startDate: format(draft.from, 'yyyy-MM-dd'),
                      endDate: format(draft.to, 'yyyy-MM-dd'),
                    })
                  }
                }}
              >
                {update.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )
    }
  }),
  columnHelper.accessor("quote", {
    header: "Quote",
    size: 100,
    cell: ({ getValue }) => {
      const quote = getValue();

      return <span>{quote ? 'Yes' : 'No'}</span>
    }
  }),
  columnHelper.display({
    id: "actions",
    size: 80,
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const data = row.original

      // Hooks are fine here: flexRender renders `cell` as a component, not by
      // calling it.
      const queryClient = useQueryClient()
      const removal = useMutation({
        mutationFn: deleteJob,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] })
          // The schedule grid is built from assignments, which cascade away
          // with the job, so it is stale too.
          queryClient.invalidateQueries({ queryKey: ['schedule'] })
          toast.success('Job deleted')
        },
        onError: (error) => {
          toast.error(error.message)
        },
      })

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                variant="destructive"
                disabled={removal.isPending}
                onClick={() => removal.mutate(data.id)}
              >
                {removal.isPending ? 'Deleting…' : 'Delete Job'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  })
])


