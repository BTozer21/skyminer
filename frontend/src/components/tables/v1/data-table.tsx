import { useTable } from '@tanstack/react-table';
import type { ColumnDef, RowData } from '@tanstack/react-table';

import { cn } from '@/lib/utils';

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
  // Pass a bounded height (e.g. "min-h-0 flex-1") to make the rows scroll
  // inside the table instead of growing the page.
  className?: string
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  className,
}: DataTableProps<TData>) {
  const table = useTable({
    features,
    data,
    columns,
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
                  // Sticky on the cells, not the row: the row's bottom border
                  // scrolls away with the body, so the border lives here too.
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
          {table.getRowModel().rows.length ? (
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
