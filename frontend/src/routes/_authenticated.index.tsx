import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { getJobs, getLeaveRequests } from '../lib/api.ts';
import { authClient, useIsAdmin } from '../auth';

export const Route = createFileRoute('/_authenticated/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const { isAdmin, isPending } = useIsAdmin();
  const leaves = useQuery({ queryKey: ['leave-requests'], queryFn: getLeaveRequests, staleTime: Infinity })
  return (
    <div className="flex flex-col px-5">
      <div className="px-4 py-4 w-fit self-center rounded-sm border border-foreground/80 bg-foreground/60">
        <p className="font-bold">Hello there, {session?.user.name}</p>
        {!isPending && (
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-sm ${isAdmin ? 'bg-amber-400 dark:bg-amber-600' : 'bg-sky-400 dark:bg-sky-600'}`}>
            {isAdmin ? 'Admin' : 'User'}
          </span>
        )}
      </div>
      {isAdmin && (
        <div className="mt-2 p-2 w-fit self-center rounded-sm border border-amber-500 text-sm">
          Admin-only content goes here
        </div>
      )}
      <div>
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

