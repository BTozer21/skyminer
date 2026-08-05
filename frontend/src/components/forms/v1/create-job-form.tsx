import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { createJob, getClients } from '@/lib/api';

export function CreateJobForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [client, setClient] = useState<{ id: number; name: string } | null>(null);

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: getClients, staleTime: Infinity });

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setName('');
      setStartDate('');
      setEndDate('');
      setClient(null);
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
        if (!client) return;
        mutation.mutate({ name, startDate, endDate, clientId: client.id });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="job-name" className="text-sm font-medium">Name</label>
        <Input id="job-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="job-client" className="text-sm font-medium">Client</label>
        <Select value={client} onValueChange={setClient} itemToStringValue={(c) => String(c.id)}>
          <SelectTrigger id="job-client" className="w-full">
            <SelectValue>
              {(c: { id: number; name: string } | null) => c?.name ?? 'Select a client'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} >
            {clients?.map((c) => (
              <SelectItem key={c.id} value={c}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
