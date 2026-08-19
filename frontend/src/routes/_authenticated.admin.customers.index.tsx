import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { CreateCustomerForm } from '@/components/forms/v1/create-customer-form.tsx';
import { getCustomers } from '@/lib/api.ts';

import { columns } from '@/components/tables/v1/customers/columns';
import { DataTable } from '@/components/tables/v1/data-table';

export const Route = createFileRoute('/_authenticated/admin/customers/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: customers, isPending } = useQuery({ queryKey: ['customers'], queryFn: getCustomers, staleTime: Infinity })

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        <h1 className="font-bold text-xl">Customers</h1>
        <CreateCustomerForm />
      </div>
      <DataTable
        columns={columns}
        data={customers ?? []}
        getRowId={(customer) => String(customer.id)}
        isLoading={isPending}
        className="min-h-0 flex-1"
      />
    </div>
  )
}

