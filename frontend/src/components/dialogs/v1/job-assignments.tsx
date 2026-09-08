import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Circle, CircleCheck, Crown, SquareArrowOutUpRight, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  createJobAssignment,
  deleteJobAssignment,
  listUsers,
  updateJobAssignmentRole,
} from '@/lib/api';
import type { ScheduleJob } from '@/lib/api';

interface JobAssignmentDialogProps {
  // null closes the dialog. The whole job is passed so adding fields here
  // never changes the call site.
  job: ScheduleJob | null
  onOpenChange: (open: boolean) => void
}

export function JobAssignmentDialog({ job, onOpenChange }: JobAssignmentDialogProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  // Same key the team page and the job form use, so this is usually cached.
  const { data: users, isPending: usersPending } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => listUsers(),
    enabled: editing,
  });

  const assign = useMutation({
    mutationFn: createJobAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const roleChange = useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'member' | 'lead' }) =>
      updateJobAssignmentRole(id, role),
    onSuccess: () => {
      // The demote of the previous lead happens server-side, so the refetch is
      // what moves the crown — nothing here is held in local state.
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removal = useMutation({
    mutationFn: deleteJobAssignment,
    onSuccess: () => {
      // The dialog reads its job out of the schedule query, so this refetch is
      // what removes the row — nothing here is held in local state.
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      toast.success('Removed from job');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const busy = assign.isPending || removal.isPending || roleChange.isPending;

  const assignments = job?.jobAssignments ?? [];
  // Edit mode lists everyone so people can be added; otherwise just the team,
  // lead first — there's at most one, enforced by a partial unique index.
  const rows = editing
    ? (users?.users ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        assignment: assignments.find(
          (assignment) => assignment.userInNeonAuth?.id === user.id,
        ),
      }))
    : [...assignments]
        .sort((a, b) => Number(b.role === 'lead') - Number(a.role === 'lead'))
        .map((assignment) => ({
          id: assignment.userInNeonAuth?.id ?? String(assignment.id),
          name: assignment.userInNeonAuth?.name ?? 'Unknown user',
          email: assignment.userInNeonAuth?.email,
          assignment,
        }));

  // The body is guarded rather than the component early-returning null: Radix
  // needs the content mounted while it animates closed.
  return (
    <Dialog
      open={job !== null}
      onOpenChange={(next) => {
        // Reopening on another job should start read-only, not mid-edit.
        if (!next) setEditing(false);
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false}>
        {job && (
          <>
            <DialogHeader>
              <DialogTitle className="flex justify-between">
                {job.name}
                <Link to="/jobs/$jobId" params={{ jobId: String(job.id) }}>
                  <SquareArrowOutUpRight className="w-4 h-fit"/>
                </Link>
              </DialogTitle>
              <DialogDescription className="flex flex-col gap-1">
                <Link to="/admin/customers/$customerId" params={{ customerId: String(job.customer.id) }}>
                  {job.customer.name}
                </Link>
                <>
                  {format(new Date(job.startDate), 'd MMM yyyy')} –{' '}
                  {format(new Date(job.endDate), 'd MMM yyyy')}
                </>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Checklist</h2>
              <div className="flex flex-col gap-1 mb-2">
                <span className="flex items-center text-sm gap-2">{job.quote ? <CircleCheck className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-blue-500" />} Quote sent</span>
                <span className="flex items-center text-sm gap-2">{job.rams ? <CircleCheck className="h-5 w-5 text-green-500"/> : <Circle className="h-5 w-5 text-blue-500" />} RAMS sent</span>
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Assigned team</h2>
                <Button
                  type="button"
                  onClick={() => setEditing((wasEditing) => !wasEditing)}
                  title={editing ? 'Done editing team' : 'Edit team'}
                  aria-label={editing ? 'Done editing team' : 'Edit team'}
                  aria-pressed={editing}
                  variant="ghost"
                  size="icon"
                  className={`size-6 ${editing ? '!border-blue-500' : ''} hover:!border-blue-500 transition-all duration-200`}
                >
                  <Users className={editing ? 'text-blue-500' : 'text-muted-foreground'} />
                </Button>
              </div>
              {editing && usersPending ? (
                <p className="text-muted-foreground text-sm">Loading team…</p>
              ) : rows.length ? (
                <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                  {rows.map(({ id, name, email, assignment }) => {
                    const isLead = assignment?.role === 'lead';

                    return (
                      <li
                        key={id}
                        data-selected={Boolean(assignment)}
                        className="bg-muted/40 data-[selected=true]:!border-blue-500 data-[selected=true]:bg-blue-500/10 flex items-center gap-1 rounded-sm border border-transparent pr-1 text-sm"
                      >
                        {/* Outside edit mode the row is inert — everyone listed
                            is already on the job, so there's nothing to toggle. */}
                        <button
                          type="button"
                          onClick={() =>
                            assignment
                              ? removal.mutate(assignment.id)
                              : assign.mutate({ jobId: job.id, userId: id })
                          }
                          disabled={!editing || busy}
                          aria-pressed={Boolean(assignment)}
                          className="flex flex-1 items-center justify-between gap-3 px-2 py-1 text-left disabled:pointer-events-none"
                        >
                          <span>{name}</span>
                          <span className="text-muted-foreground text-xs">{email}</span>
                        </button>
                        {/* Only someone on the job can lead it. */}
                        {assignment && (
                          <Button
                            type="button"
                            onClick={() =>
                              roleChange.mutate({
                                id: assignment.id,
                                role: isLead ? 'member' : 'lead',
                              })
                            }
                            disabled={busy}
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
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No one is assigned to this job.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
