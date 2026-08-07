import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';

import type { DataTableFeatures } from '../data-table-features.ts';
import type { JobResponse } from '@/lib/api';


const columnHelper = createColumnHelper<DataTableFeatures, JobResponse>()

export const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("client.name", {
    id: "client",
    header: "Client",
  }),
  columnHelper.accessor("startDate", {
    header: "Start Date",
    cell: ({ getValue }) => {
      const createdAt = getValue()

      if (!createdAt) return <span className="text-muted-foreground">-</span>

      return format(new Date(createdAt), 'd MMM yyyy')
    }
  }),
  columnHelper.accessor("endDate", {
    header: "End Date",
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

      return (
        <div className="text-right">
          Action for {data.name}
        </div>
      )
    }
  })
])


