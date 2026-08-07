import { format } from 'date-fns';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ScheduleJob } from '@/lib/api';

interface JobAssignmentDialogProps {
  // null closes the dialog. The whole job is passed so adding fields here
  // never changes the call site.
  job: ScheduleJob | null
  onOpenChange: (open: boolean) => void
}

export function JobAssignmentDialog({ job, onOpenChange }: JobAssignmentDialogProps) {
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
                  {job.jobAssignments.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="bg-muted/40 flex items-center justify-between gap-3 rounded-sm p-2 text-sm"
                    >
                      <span>{assignment.userInNeonAuth?.name ?? 'Unknown user'}</span>
                      <span className="text-muted-foreground text-xs">
                        {assignment.userInNeonAuth?.email}
                      </span>
                    </li>
                  ))}
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
