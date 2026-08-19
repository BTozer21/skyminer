import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '@/lib/api';

import { CreateLocationForm } from '@/components/forms/v1/create-location-form';

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
          <>
            <h1>
              {customer?.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {customer?.jobs.length ?? 0} job{customer?.jobs.length === 1 ? '' : 's'}
            </p>
          </>
        }
      </div>
      <div className="flex justify-between">
        <h3 className="test">Locations</h3>
        <CreateLocationForm
          customer={customerId}
        />
      </div>
      {!isPending &&
        <>
          <p>
            {customer?.locations.length ?? 0} locations
          </p>
        </>
      }
    </div>
  )
}
