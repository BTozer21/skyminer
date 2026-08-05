import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';

export const Route = createFileRoute('/_authenticated/admin/clients')({
  component: RouteComponent,
})

function RouteComponent() {

  return (
    <div className="flex flex-col px-5">
      <h1 className="font-bold text-xl">This is an admin route</h1>
      <div className="my-4">
        <h1 className="font-bold text-xl">Create Clients</h1>
      </div>
    </div>
  )
}

