import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { getJobs, getLeaveRequests } from '../lib/api.ts';

export const Route = createFileRoute('/_authenticated/')({
  component: RouteComponent,
})

function RouteComponent() {
  const query = useQuery({ queryKey: ['jobs'], queryFn: getJobs, staleTime: Infinity });
  const leaves = useQuery({ queryKey: ['leave-requests'], queryFn: getLeaveRequests, staleTime: Infinity })
  return (
    <div className="flex flex-col px-5 items-center">
      <div className="px-4 py-4 rounded-sm border border-foreground/80 bg-foreground/60">
        <p className="font-bold">Hello there,</p>
      </div>
      {query.data?.map((x) => (
        <div key={x.id}>
          {x.id} - {x.name}
        </div>
      ))}
      {leaves.data?.map((x) => (
        <div key={x.id}>
          {x.id} - {x.approved ? "Approved" : "Not Approved"}
        </div>
      ))}
    </div>
  )
}

