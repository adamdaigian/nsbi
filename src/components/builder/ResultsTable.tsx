import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";

interface ResultsTableProps {
  rows: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  loading?: boolean;
  error?: string | null;
}

const columnHelper = createColumnHelper<Record<string, unknown>>();

export function ResultsTable({ rows, columns, loading, error }: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo(() => {
    return columns.map((col) =>
      columnHelper.accessor((row) => row[col.name], {
        id: col.name,
        header: col.name,
        cell: (info) => {
          const val = info.getValue();
          if (val == null) return <span className="text-[#666]">null</span>;
          if (typeof val === "object") return JSON.stringify(val);
          return String(val);
        },
      }),
    );
  }, [columns]);

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[#666]">
        Running query...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-[12px] text-[hsl(0,84%,60%)]">
        {error}
      </div>
    );
  }

  if (rows.length === 0 && columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12px] text-[#666]">
        Run a query to see results
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer select-none whitespace-nowrap border-b border-[rgba(148,148,148,0.12)] bg-[#0A0B0B] px-3 py-1.5 text-left text-[11px] font-medium text-[#949494] hover:text-[#FFFFFF] transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
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
                className="border-b border-[rgba(148,148,148,0.04)] hover:bg-[rgba(64,64,64,0.1)]"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-3 py-1 text-[#FFFFFF]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-[rgba(148,148,148,0.08)] text-[11px] text-[#666] shrink-0">
        <span>{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="text-[#949494] hover:text-[#FFFFFF] disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="text-[#949494] hover:text-[#FFFFFF] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
