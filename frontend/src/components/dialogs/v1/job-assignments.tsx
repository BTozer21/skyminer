import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteJobAssignment } from '@/lib/api';
import type { ScheduleJob } from '@/lib/api';

interface JobAssignmentDialogProps {
  // null closes the dialog. The whole job is passed so adding fields here
  // never changes the call site.
  job: ScheduleJob | null
  onOpenChange: (open: boolean) => void
}

export function JobAssignmentDialog({ job, onOpenChange }: JobAssignmentDialogProps) {
  const queryClient = useQueryClient();

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

  // The body is guarded rather than the component early-returning null: Radix
  // needs the content mounted while it animates closed.
  return (
    <Dialog open={job !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {job && (
          <>
            <DialogHeader>
              <DialogTitle>{job.name}</DialogTitle>
              <DialogDescription>
                {format(new Date(job.startDate), 'd MMM yyyy')} –{' '}
                {format(new Date(job.endDate), 'd MMM yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Assigned team</h2>
              {job.jobAssignments.length ? (
                <ul className="flex flex-col gap-1">
                  {job.jobAssignments.map((assignment) => {
                    const name = assignment.userInNeonAuth?.name ?? 'Unknown user';
                    // Only the row being removed is disabled, so a slow request
                    // doesn't lock the rest of the list.
                    const isRemoving =
                      removal.isPending && removal.variables === assignment.id;

                    return (
                      <li
                        key={assignment.id}
                        className="bg-muted/40 flex items-center justify-between gap-3 rounded-sm p-2 text-sm"
                      >
                        <span>{name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {assignment.userInNeonAuth?.email}
                          </span>
                          <Button
                            type="button"
                            onClick={() => removal.mutate(assignment.id)}
                            disabled={isRemoving}
                            title={`Remove ${name} from this job`}
                            aria-label={`Remove ${name} from this job`}
                            variant="ghost"
                            size="icon"
                            className="size-6"
                          >
                            <X />
                          </Button>
                        </div>
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
