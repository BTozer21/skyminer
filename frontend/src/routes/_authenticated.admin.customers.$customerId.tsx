import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getCustomer, getLocation } from '@/lib/api';

import { CreateLocationForm } from '@/components/forms/v1/create-location-form';
import { CreateMachineForm } from '@/components/forms/v1/create-machine-form';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
          <LocationRow key={x.id} location={x} />
        ))}
      </div>
    </div>
  )
}

type CustomerLocation = NonNullable<
  Awaited<ReturnType<typeof getCustomer>>
>['locations'][number]

function LocationRow({ location }: { location: CustomerLocation }) {
  const [open, setOpen] = useState(false);

  // The customer payload carries the location but not its machines, so those
  // are fetched per-row and only once the row is actually opened.
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['locations', String(location.id)],
    queryFn: () => getLocation(location.id),
    staleTime: Infinity,
    enabled: open,
  })

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group w-full">
          {location.name}
          <ChevronDownIcon className="ml-auto group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4">
        <div className="flex flex-col gap-2">
          Post Code: {location.postCode}
          <div className="flex flex-row items-center justify-between">
            Machines
            <CreateMachineForm location={String(location.id)} />
          </div>
          {isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : data.machines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No machines yet</p>
          ) : (
            <ul className="flex flex-row gap-1">
              {data.machines.map((machine) => (
                <div key={machine.id} className="text-sm flex gap-2 rounded-sm border p-4 items-center w-[400px] justify-center">
                  <span className="font-bold text-xl">{machine.name}</span> - {machine.type}
                </div>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
