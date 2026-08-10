import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { CreateClientForm } from '@/components/forms/v1/create-client-form.tsx';
import { getClients } from '@/lib/api.ts';

import { columns } from '@/components/tables/v1/clients/columns';
import { DataTable } from '@/components/tables/v1/data-table';

export const Route = createFileRoute('/_authenticated/admin/clients')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: clients, isPending } = useQuery({ queryKey: ['clients'], queryFn: getClients, staleTime: Infinity })

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        <h1 className="font-bold text-xl">Clients</h1>
        <CreateClientForm />
      </div>
      <DataTable
        columns={columns}
        data={clients ?? []}
        isLoading={isPending}
        className="min-h-0 flex-1"
      />
    </div>
  )
}

