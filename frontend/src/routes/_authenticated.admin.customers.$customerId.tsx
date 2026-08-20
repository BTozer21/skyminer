import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '@/lib/api';

import { CreateLocationForm } from '@/components/forms/v1/create-location-form';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon } from 'lucide-react';

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
      <div id="customer_locations" className="flex justify-between mb-2">
        <h3 className="test">Locations</h3>
        <CreateLocationForm
          customer={customerId}
        />
      </div>
      <div className="flex flex-col gap-3">
        {customer?.locations.map((x) => (
          <Collapsible key={x.id}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="group w-full">
                {x.name}
                <ChevronDownIcon className="ml-auto group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4">
              Post Code: {x.postCode}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}
