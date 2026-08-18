import { createColumnHelper } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { deleteCustomer } from '@/lib/api';

import type { DataTableFeatures } from '../data-table-features.ts';
import type { CustomerResponse } from '@/lib/api';


const columnHelper = createColumnHelper<DataTableFeatures, CustomerResponse>()

export const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
    size: 240,
    cell: ({ row }) => {
      const customer = row.original

      return (
        <Link
          to="/admin/customers/$customerId"
          params={{ customerId: String(customer.id) }}
          className="font-medium hover:underline"
        >
          {customer.name}
        </Link>
      )
    }

  }),
  columnHelper.accessor("createdAt", {
    header: "Added on",
    cell: ({ getValue }) => {
      const createdAt = getValue()

      if (!createdAt) return <span className="text-muted-foreground">-</span>

      return format(new Date(createdAt), 'd MMM yyyy')
    }
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const data = row.original

      // Hooks are fine here: flexRender renders `cell` as a component, not by
      // calling it.
      const queryClient = useQueryClient()
      const removal = useMutation({
        mutationFn: deleteCustomer,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['customers'] })
          toast.success('Customer deleted')
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
                variant="destructive"
                disabled={removal.isPending}
                onClick={() => removal.mutate(data.id)}
              >
                {removal.isPending ? 'Deleting…' : 'Delete Customer'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  })
])

