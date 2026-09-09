import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '@/lib/api';

import { CreateMachineForm } from '@/components/forms/v1/create-machine-form';

export const Route = createFileRoute(
  '/_authenticated/admin/customers/$customerId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { customerId } = Route.useParams();

  const { data: customer, isPending } = useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => getCustomer(Number(customerId)),
    staleTime: Infinity
  })

  return (
    <div className="flex h-full flex-col px-5 pb-5">
      <div className="mb-4 mt-2 flex shrink-0 justify-between items-center">
        {!isPending &&
          <h1>
            {customer?.name}
          </h1>
        }
      </div>
      <div id="customer_machines" className="flex justify-between mb-2">
        <h3 className="test">Machines</h3>
        <CreateMachineForm customer={customerId} />
      </div>
      <div className="flex flex-col gap-2">
        {customer?.machines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No machines yet</p>
        ) : (
          customer?.machines.map((machine) => (
            <div key={machine.id} className="text-sm flex gap-2 rounded-sm border p-4 items-center w-[400px] justify-center">
              <span className="font-bold text-xl">{machine.type}</span>
              {machine.location && <> - {machine.location}</>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
