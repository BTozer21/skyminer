import { useTable } from '@tanstack/react-table';
import type { ColumnDef, RowData } from '@tanstack/react-table';

import { cn } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { features } from './data-table-features.ts';
import type { DataTableFeatures } from './data-table-features.ts';

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[]
  data: TData[]
  isLoading?: boolean
  skeletonRows?: number
  className?: string
  getRowId?: (row: TData, index: number) => string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 8,
  className,
  getRowId,
}: DataTableProps<TData>) {
  const table = useTable({
    features,
    data,
    columns,
    getRowId,
    defaultColumn: {
      size: 200,
      minSize: 50,
      maxSize: 500,
    },
  })

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-md border", className)}>
      <Table containerClassName="min-h-0 flex-1">
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="bg-muted sticky top-0 z-10 border-b"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i}>
                {table.getAllLeafColumns().map((column) => (
                  <TableCell key={column.id} style={{ width: column.getSize() }}>
                    <Skeleton className="h-5 w-[70%]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
