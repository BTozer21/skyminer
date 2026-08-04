import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { createJob } from '@/lib/api';

export function CreateJobForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setName('');
      setStartDate('');
      setEndDate('');
      toast.add({ title: 'Job created', type: 'success' });
    },
    onError: (error) => {
      toast.add({ title: error.message, type: 'error' });
    },
  });

  return (
    <form
      className="flex flex-col gap-2 w-fit"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ name, startDate, endDate });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="job-name" className="text-sm font-medium">Name</label>
        <Input id="job-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="job-start-date" className="text-sm font-medium">Start date</label>
        <Input id="job-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="job-end-date" className="text-sm font-medium">End date</label>
        <Input id="job-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating…' : 'Create job'}
      </Button>
      {mutation.isError && <p className="text-red-500 text-sm">{mutation.error.message}</p>}
    </form>
  );
}
