import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend, FieldDescription } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createJob, getClients } from '@/lib/api';

export function CreateJobForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('');

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: getClients, staleTime: Infinity });
  const clientMap = clients?.map((x) => ({
    value: String(x.id),
    label: x.name
  })) ?? [];

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
    <div className="w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!clientId) return;
          mutation.mutate({ name, startDate, endDate, clientId: Number(clientId) });
        }}
      >
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Job</FieldLegend>
            <FieldDescription>Add a Job to the schedule.</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="job-name">
                  Name
                </FieldLabel>
                <Input 
                  id="job-name"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="clientId">
                  Client
                </FieldLabel>
                <Select
                  name="clientId"
                  items={clientMap}
                  value={clientId}
                  onValueChange={(value) => setClientId(value ?? '')}
                  required
                >
                  <SelectTrigger id="job-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {clientMap.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="job-start-date">
                  Start date
                </FieldLabel>
                <Input id="job-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="job-end-date">
                  End date
                </FieldLabel>
                <Input id="job-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </Field>
            </FieldGroup>
          </FieldSet>
          <Field orientation="horizontal">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create job'}
          </Button>
          {mutation.isError && <p className="text-red-500 text-sm">{mutation.error.message}</p>}
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
