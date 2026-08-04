import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query';
import { authClient } from '../auth';
import { CreateJobForm } from '@/components/forms/v1/create-job-form';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: RouteComponent,
})

function RouteComponent() {
  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <div className="flex flex-col px-5">
      <h1 className="font-bold text-xl">This is an admin route</h1>
      <div className="my-4">
        <h1 className="font-bold text-xl">Create job</h1>
        <CreateJobForm />
      </div>
      <div>
        <h1 className="font-bold text-xl">Users ({users.data?.total ?? 0})</h1>
        <div className="flex flex-col gap-2">
          {users.data?.users.map((user) => (
            <div key={user.id} className="w-fit flex gap-2 p-2 rounded-sm border border-foreground/20">
              <span className="font-medium">{user.name}</span>
              <span>{user.email}</span>
              <span className={`px-2 rounded-sm ${user.role?.split(',').includes('admin') ? 'bg-amber-400 dark:bg-amber-600' : 'bg-sky-400 dark:bg-sky-600'}`}>
                {user.role ?? 'user'}
              </span>
              {user.banned && <span className="px-2 rounded-sm bg-red-400 dark:bg-red-600">Banned</span>}
            </div>
          ))}
        </div>
        {users.isError && <p className="text-red-500">Failed to load users: {users.error.message}</p>}
      </div>
    </div>
  )
}
