import { createColumnHelper } from '@tanstack/react-table';

import type { DataTableFeatures } from './data-table-features';
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
    cell: ({ getValue }) => <div className="uppercase">{getValue()}</div>
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
