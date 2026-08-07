import { createColumnHelper } from '@tanstack/react-table';

import type { DataTableFeatures } from '../data-table-features';
import type { ClientResponse } from '@/lib/api';


const columnHelper = createColumnHelper<DataTableFeatures, ClientResponse>()

export const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("createdAt", {
    header: "Added on"
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => {
      const user = row.original

      return (
        <div className="text-right">
          Action for {user.name}
        </div>
      )
    }
  })
])

