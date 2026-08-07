import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '../auth';

import { columns } from '@/components/tables/v1/users/columns';
import { DataTable } from '@/components/tables/v1/data-table';

export const Route = createFileRoute('/_authenticated/admin/team')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: users, isPending } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <div className="flex flex-col px-5">
      <h1 className="font-bold text-xl mb-4 mt-2">Users</h1>
      <div>
        {isPending && <p>Waiting for Users</p>}
        {users && <DataTable columns={columns} data={users.users} />}
      </div>
    </div>
  )
}
