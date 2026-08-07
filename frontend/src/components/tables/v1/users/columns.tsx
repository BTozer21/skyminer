import { createColumnHelper } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/auth';

import type { DataTableFeatures } from '../data-table-features';
import type { AdminUser } from '@/lib/api';


const columnHelper = createColumnHelper<DataTableFeatures, AdminUser>()

export const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("email", {
    header: "Email",
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: ({ getValue }) => <div className="first-letter:uppercase">{getValue()}</div>
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const user = row.original
      const isAdmin = user.role?.split(',').includes('admin') ?? false

      // Hooks are fine here: flexRender renders `cell` as a component, not by
      // calling it.
      const queryClient = useQueryClient()
      const roleChange = useMutation({
        mutationFn: async () => {
          const { error } = await authClient.admin.setRole({
            userId: user.id,
            role: isAdmin ? 'user' : 'admin',
          })
          if (error) throw new Error(error.message)
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] })
          toast.success(isAdmin ? 'Admin access removed' : 'User promoted to admin')
        },
        onError: (error) => {
          toast.error(error.message)
        },
      })

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                variant={isAdmin ? 'destructive' : undefined}
                disabled={roleChange.isPending}
                onClick={() => roleChange.mutate()}
              >
                {roleChange.isPending
                  ? isAdmin ? 'Removing…' : 'Promoting…'
                  : isAdmin ? 'Remove admin' : 'Make admin'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  })
])
