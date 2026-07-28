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
    <div className="flex flex-col px-5">
      <div className="px-4 py-4 w-fit self-center rounded-sm border border-foreground/80 bg-foreground/60">
        <p className="font-bold">Hello there,</p>
      </div>
      <div>
        <h1 className="font-bold text-xl">Jobs</h1>
        {query.data?.map((x) => (
          <div key={x.id}>
            {x.id} - {x.name}
          </div>
        ))}
      </div>
      <div className="">
        <h1 className="font-bold text-xl">Personal Leave Requests</h1>
        <div className="flex flex-col gap-2">
          {leaves.data?.map((x) => (
            <div key={x.id} className={`w-fit flex gap-2 p-2 rounded-sm ${x.approved ? 'bg-green-400 dark:bg-green-600' : 'bg-red-400 dark:bg-red-600'}`}>
                <span>{x.id} - {x.approved ? "Approved" : "Not Approved"}</span>
                <span>Requested: {new Date(x.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

