import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { createClient } from '@/lib/api';

export function CreateClientForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setName('');
      toast.add({ title: 'Client added', type: 'success' });
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
        mutation.mutate({ name });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="job-name" className="text-sm font-medium">Name</label>
        <Input id="job-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating…' : 'Create Client'}
      </Button>
      {mutation.isError && <p className="text-red-500 text-sm">{mutation.error.message}</p>}
    </form>
  );
}

