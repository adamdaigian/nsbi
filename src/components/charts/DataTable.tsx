"use client";

import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
// TODO: reconnect after YAML config parser (ChartContainer was removed)

interface DataTableProps {
  data: Record<string, unknown>[];
  columns?: string[];
  title?: string;
  subtitle?: string;
  height?: number;
  pageSize?: number;
}

const columnHelper = createColumnHelper<Record<string, unknown>>();

export function DataTable({
  data,
  columns: columnNames,
  title,
  subtitle,
  height = 400,
  pageSize = 10,
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const resolvedColumns = useMemo(() => {
    const names =
      columnNames ??
      (data.length > 0 ? Object.keys(data[0]!) : []);

    return names.map((name) =>
      columnHelper.accessor((row) => row[name], {
        id: name,
        header: name,
        cell: (info) => {
          const val = info.getValue();
          if (val == null) return <span className="text-muted-foreground/50">null</span>;
          if (val instanceof Date) return val.toLocaleDateString();
          if (typeof val === "object") return JSON.stringify(val);
          return `${val as string | number | boolean}`;
        },
      }),
    );
  }, [data, columnNames]);

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div
      className="rounded-[8px] border border-border bg-card p-4"
      style={{ minHeight: height }}
    >
      <div className="flex flex-col gap-3" style={{ minHeight: height }}>
        <div>
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search..."
            className="h-[36px] w-full max-w-[240px] rounded-[4px] border border-border bg-black/20 px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer select-none whitespace-nowrap border-b border-border px-3 py-2 text-left font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: " \u2191",
                          desc: " \u2193",
                        }[header.column.getIsSorted() as string] ?? null}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/50 hover:bg-accent transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="whitespace-nowrap px-3 py-2 text-foreground"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
            {" · "}
            {table.getFilteredRowModel().rows.length} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-[4px] border border-border px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-[4px] border border-border px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
