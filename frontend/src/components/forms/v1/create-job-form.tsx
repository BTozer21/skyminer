import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { createJob, getClients } from '@/lib/api';

export function CreateJobForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: getClients, staleTime: Infinity });

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setName('');
      setStartDate('');
      setEndDate('');
      setClientId('');
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
        if (!clientId) return;
        mutation.mutate({ name, startDate, endDate, clientId: Number(clientId) });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="job-name" className="text-sm font-medium">Name</label>
        <Input id="job-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="job-client" className="text-sm font-medium">Client</label>
        <select
          id="job-client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          className="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
        >
          <option value="" disabled>Select a client</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
