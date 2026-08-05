import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { CreateClientForm } from '@/components/forms/v1/create-client-form.tsx';
import { CreateJobForm } from '@/components/forms/v1/create-job-form.tsx';
import { getClients } from '@/lib/api.ts';

export const Route = createFileRoute('/_authenticated/admin/clients')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: getClients, staleTime: Infinity })

  return (
    <div className="flex flex-col px-5">
      <h1 className="font-bold text-xl">This is an admin route</h1>
      <div className="my-4">
        <h1 className="font-bold text-xl">Create Clients</h1>
        <CreateClientForm />
      </div>
      <div>
        <h1 className="font-bold text-xl">Clients</h1>
        {clients?.map((x) => (
          <div key={x.id}>
            {x.id} - {x.name}
          </div>
        ))}
      </div>
      <div>
        <CreateJobForm />
      </div>
    </div>
  )
}

