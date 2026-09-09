import { useState } from 'react'
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, format } from 'date-fns'
import { CalendarIcon, CheckCircle2, Circle, Crown, Trash2, Users } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { toast } from 'sonner'

import {
  createJobAssignment,
  deleteJob,
  deleteJobAssignment,
  getJob,
  listUsers,
  updateJob,
  updateJobAssignmentRole,
} from '@/lib/api'
import type { JobResponse, JobRole } from '@/lib/api'
import { STATUS_CONFIG, STATUSES, jobTitle } from '@/lib/v1/jobs'
import { useIsAdmin } from '@/auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// Same set, and same order, as the jobs table so the two screens read alike.
const CHECKS = [
  { field: 'quote', label: 'Quote' },
  { field: 'rams', label: 'RAMS' },
  { field: 'po', label: 'PO' },
  { field: 'report', label: 'Report' },
  { field: 'invoice', label: 'Invoice' },
] as const satisfies readonly { field: keyof JobResponse; label: string }[]

// Day rate per person, by customer type.
const DAY_RATE = { industrial: 175, school: 110 } as const

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

type Job = Awaited<ReturnType<typeof getJob>>

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
  const { isAdmin } = useIsAdmin()

  // Admins edit the job in place; everyone else reads it.
  const queryClient = useQueryClient()
  const update = useMutation({
    mutationFn: (patch: Parameters<typeof updateJob>[1]) =>
      updateJob(Number(jobId), patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['jobs', jobId] })
      const previous = queryClient.getQueryData<Job>(['jobs', jobId])
      queryClient.setQueryData<Job>(['jobs', jobId], (old) =>
        old ? { ...old, ...patch } : old,
      )
      return { previous }
    },
    onError: (error, _patch, context) => {
      queryClient.setQueryData(['jobs', jobId], context?.previous)
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
  })

  const dates: DateRange | undefined = job?.startDate
    ? {
        from: new Date(job.startDate),
        to: job.endDate ? new Date(job.endDate) : undefined,
      }
    : undefined
  const [datesOpen, setDatesOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(dates)
  const dateLabel = !job?.startDate
    ? null
    : !job.endDate || job.startDate === job.endDate
      ? format(new Date(job.startDate), 'EEE d MMM yy')
      : `${format(new Date(job.startDate), 'EEE d MMM yy')} – ${format(new Date(job.endDate), 'EEE d MMM yy')}`

  // The team rides along with the job — the endpoint only returns it to admins
  // and to people on the job themselves.
  const team = job?.jobAssignments ?? []

  // Same toggle as the schedule's assignment dialog: the Users icon swaps the
  // team list for everyone who could be on it.
  const [editingTeam, setEditingTeam] = useState(false)
  // Same key the team page and the job form use, so this is usually cached.
  const { data: users, isPending: usersPending } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => listUsers(),
    enabled: isAdmin && editingTeam,
  })

  // The team is refetched rather than patched locally: the server demotes the
  // previous lead itself, so only a refetch knows where the crown ended up.
  const onTeamChange = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  }
  const assign = useMutation({ mutationFn: createJobAssignment, ...onTeamChange })
  const roleChange = useMutation({
    mutationFn: ({ id, role }: { id: number; role: JobRole }) => updateJobAssignmentRole(id, role),
    ...onTeamChange,
  })
  const removal = useMutation({ mutationFn: deleteJobAssignment, ...onTeamChange })

  const navigate = useNavigate()
  const jobRemoval = useMutation({
    mutationFn: () => deleteJob(Number(jobId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      // Assignments cascade away with the job, so the schedule is stale too.
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      toast.success('Job deleted')
      navigate({ to: '/admin/jobs' })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
  const teamBusy = assign.isPending || roleChange.isPending || removal.isPending

  // Editing lists everyone so people can be added; otherwise just the team,
  // lead first — there's at most one, enforced by a partial unique index.
  const rows = editingTeam
    ? (users?.users ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        assignment: team.find((member) => member.userInNeonAuth.id === user.id),
      }))
    : [...team]
        .sort((a, b) => Number(b.role === 'lead') - Number(a.role === 'lead'))
        .map((member) => ({
          id: member.userInNeonAuth.id,
          name: member.userInNeonAuth.name,
          email: member.userInNeonAuth.email,
          assignment: member,
        }))

  // Both ends of the range are worked, so a single-day job is one day.
  const days = job?.startDate
    ? differenceInCalendarDays(new Date(job.endDate), new Date(job.startDate)) + 1
    : 0
  const rate = job ? DAY_RATE[job.customer.type] : 0
  const cost = rate * team.length * days

  const status = job ? STATUS_CONFIG[job.status] : null
  const StatusIcon = status?.icon

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        <h1 className="font-bold text-xl">
          {isPending ? <Skeleton className="h-7 w-48" /> : job && jobTitle(job, { withCustomer: false })}
        </h1>
      </div>

      {isError ? (
        <p className="text-destructive">Could not load this job.</p>
      ) : (
        <dl className="grid max-w-md grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{isPending ? <Skeleton className="h-5 w-40" /> : job?.customer?.name ?? '-'}</dd>

          {/* Status is an internal, admin-only concern — team members only
              need the job itself. */}
          {isAdmin && (
            <>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                {isPending || !status ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        disabled={update.isPending}
                        className={`-m-2 flex w-fit items-center gap-2 rounded-sm p-2 text-left capitalize hover:bg-muted disabled:opacity-50 ${status.className}`}
                      >
                        {StatusIcon && (
                          <StatusIcon className="size-4 shrink-0" />
                        )}
                        {job.status}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {STATUSES.map((next) => {
                        const { icon: Icon, className } = STATUS_CONFIG[next]

                        return (
                          <DropdownMenuItem
                            key={next}
                            className="gap-2 capitalize hover:cursor-pointer"
                            onClick={() =>
                              update.mutate(
                                { status: next },
                                {
                                  onSuccess: () =>
                                    toast.success('Status updated'),
                                },
                              )
                            }
                          >
                            <Icon className={`size-4 ${className}`} />
                            {next}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </dd>
            </>
          )}

          <dt className="text-muted-foreground">Date</dt>
          <dd>
            {isPending ? (
              <Skeleton className="h-5 w-56" />
            ) : isAdmin ? (
              <Popover
                open={datesOpen}
                onOpenChange={(next) => {
                  setDatesOpen(next)
                  if (next) setDraft(dates)
                }}
              >
                <PopoverTrigger asChild>
                  <button className="-m-2 flex w-fit items-center gap-2 rounded-sm p-2 text-left hover:bg-muted">
                    <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                    {dateLabel ?? (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDatesOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!draft?.from || !draft.to || update.isPending}
                      onClick={() => {
                        if (!draft?.from || !draft.to) return
                        update.mutate(
                          {
                            startDate: format(draft.from, 'yyyy-MM-dd'),
                            endDate: format(draft.to, 'yyyy-MM-dd'),
                          },
                          {
                            onSuccess: () => {
                              setDatesOpen(false)
                              toast.success('Dates updated')
                            },
                          },
                        )
                      }}
                    >
                      {update.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              (dateLabel ?? '-')
            )}
          </dd>

          {/* Internal pricing — day rate per person, so it moves with the team
              and the dates above. Admin-only, like the status. */}
          {isAdmin && (
            <>
              <dt className="text-muted-foreground">Cost</dt>
              <dd>
                {isPending ? (
                  <Skeleton className="h-5 w-32" />
                ) : !cost ? (
                  '-'
                ) : (
                  <>
                    {GBP.format(cost)}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {team.length} × {days} {days === 1 ? 'day' : 'days'} ×{' '}
                      {GBP.format(rate)}
                    </span>
                  </>
                )}
              </dd>
            </>
          )}
        </dl>
      )}

      {isAdmin && !isError && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {CHECKS.map(({ field, label }) => {
            const checked = Boolean(job?.[field])

            return isPending ? (
              <Skeleton key={field} className="h-5 w-20" />
            ) : (
              <button
                key={field}
                disabled={update.isPending}
                onClick={() =>
                  update.mutate(
                    { [field]: !checked },
                    { onSuccess: () => toast.success(`${label} updated`) },
                  )
                }
                className="-m-2 flex items-center gap-2 rounded-sm p-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                {checked ? (
                  <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="size-4 shrink-0 text-blue-500" />
                )}
                {label}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6 mb-2 flex max-w-md items-center justify-between">
        <h2 className="font-medium">Team</h2>
        {isAdmin && (
          <Button
            type="button"
            onClick={() => setEditingTeam((wasEditing) => !wasEditing)}
            title={editingTeam ? 'Done editing team' : 'Edit team'}
            aria-label={editingTeam ? 'Done editing team' : 'Edit team'}
            aria-pressed={editingTeam}
            variant="ghost"
            size="icon"
            className={`size-6 ${editingTeam ? '!border-blue-500' : ''} hover:!border-blue-500 transition-all duration-200`}
          >
            <Users className={editingTeam ? 'text-blue-500' : 'text-muted-foreground'} />
          </Button>
        )}
      </div>
      {isPending || (editingTeam && usersPending) ? (
        <Skeleton className="h-5 w-40" />
      ) : rows.length ? (
        <ul className="flex max-h-72 max-w-md flex-col gap-1 overflow-y-auto text-sm">
          {rows.map(({ id, name, email, assignment }) => {
            const isLead = assignment?.role === 'lead'

            return (
              <li
                key={id}
                data-selected={Boolean(assignment)}
                className="bg-muted/40 data-[selected=true]:!border-blue-500 data-[selected=true]:bg-blue-500/10 flex items-center gap-1 rounded-sm border border-transparent pr-1"
              >
                {/* Outside edit mode the row is inert — everyone listed is
                    already on the job, so there's nothing to toggle. */}
                <button
                  type="button"
                  onClick={() =>
                    assignment
                      ? removal.mutate(assignment.id, {
                          onSuccess: () => toast.success(`${name} removed from this job`),
                        })
                      : assign.mutate(
                          { jobId: Number(jobId), userId: id },
                          { onSuccess: () => toast.success(`${name} added to this job`) },
                        )
                  }
                  disabled={!editingTeam || teamBusy}
                  aria-pressed={Boolean(assignment)}
                  className="flex flex-1 items-center justify-between gap-3 px-2 py-1 text-left disabled:pointer-events-none"
                >
                  <span>{name}</span>
                  <span className="text-muted-foreground text-xs">{email}</span>
                </button>
                {/* Only someone on the job can lead it. */}
                {assignment &&
                  (isAdmin ? (
                    <Button
                      type="button"
                      onClick={() =>
                        roleChange.mutate({ id: assignment.id, role: isLead ? 'member' : 'lead' })
                      }
                      disabled={teamBusy}
                      title={isLead ? 'Team lead' : `Make ${name} team lead`}
                      aria-label={isLead ? 'Team lead' : `Make ${name} team lead`}
                      aria-pressed={isLead}
                      variant="ghost"
                      size="icon"
                      className={`size-6 ${isLead ? '!border-amber-500' : ''} hover:!border-amber-500 transition-all duration-200`}
                    >
                      <Crown
                        className={isLead ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}
                      />
                    </Button>
                  ) : (
                    isLead && (
                      <Crown className="mr-1 size-4 shrink-0 fill-amber-400 text-amber-500" />
                    )
                  ))}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No one is assigned to this job.</p>
      )}

      {isAdmin && !isError && (
        <div className="mt-10 max-w-md border-t pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                disabled={jobRemoval.isPending}
                className="text-destructive mx-auto flex items-center gap-2 text-sm font-medium hover:underline disabled:opacity-50"
              >
                <Trash2 className="size-4 shrink-0" />
                Delete this job
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete “{job ? jobTitle(job) : 'this job'}”?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the job and everything scheduled
                  against it. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="border-t-0 bg-transparent">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => jobRemoval.mutate()}>
                  Delete Job
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
