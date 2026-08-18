import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { createJobAssignment, getJobs } from '@/lib/api';

export interface AssignmentTarget {
  userId: string
  userName: string
  date: Date
}

interface AddJobAssignmentDialogProps {
  // null closes the dialog. Carries the cell that was clicked: who, and when.
  target: AssignmentTarget | null
  onOpenChange: (open: boolean) => void
}

export function AddJobAssignmentDialog({ target, onOpenChange }: AddJobAssignmentDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* The form owns the picked job, so closing the dialog unmounts it and
            the next cell you open starts empty — no effect needed to reset. */}
        {target && <AssignForm target={target} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

function AssignForm({
  target,
  onOpenChange,
}: {
  target: AssignmentTarget
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string>('');

  // Same query the jobs page uses, so this is usually served from cache.
  const { data: jobs, isPending } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    staleTime: Infinity,
  });

  const day = format(target.date, 'yyyy-MM-dd');
  // Only jobs actually running on the clicked day can explain that cell.
  const candidates = (jobs ?? []).filter(
    (job) => job.startDate <= day && day <= job.endDate,
  );

  const mutation = useMutation({
    mutationFn: createJobAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      toast.success('Assigned to job');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assign {target.userName}</DialogTitle>
        <DialogDescription>
          Jobs running on {format(target.date, 'd MMM yyyy')}
        </DialogDescription>
      </DialogHeader>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading jobs…</p>
      ) : candidates.length ? (
        <Select value={jobId} onValueChange={setJobId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pick a job" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((job) => (
              <SelectItem key={job.id} value={String(job.id)}>
                {job.name} — {job.customer?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="text-muted-foreground text-sm">No jobs run on this day.</p>
      )}

      <div className="flex flex-row gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          disabled={!jobId || mutation.isPending}
          onClick={() => mutation.mutate({ jobId: Number(jobId), userId: target.userId })}
        >
          {mutation.isPending ? 'Assigning…' : 'Assign'}
        </Button>
      </div>
    </>
  )
}
