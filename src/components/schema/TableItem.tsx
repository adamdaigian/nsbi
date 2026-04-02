import React, { useState } from "react";
import type { TableSchema } from "@/types/schema";
import { ColumnItem } from "./ColumnItem";
import { cn } from "@/lib/utils";

interface TableItemProps {
  table: TableSchema;
  selected?: boolean;
  onSelect?: (tableName: string) => void;
}

export function TableItem({ table, selected, onSelect }: TableItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("border-b border-border/70 last:border-b-0", selected && "bg-primary/5")}>
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 pl-3 text-muted-foreground hover:text-foreground shrink-0"
          aria-label={expanded ? "Collapse columns" : "Expand columns"}
        >
          <svg
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        <button
          onClick={() => onSelect?.(table.name)}
          className={cn(
            "flex items-center gap-2 flex-1 min-w-0 py-2 pr-3 text-left hover:bg-accent/50 transition-colors",
            selected && "text-primary",
          )}
        >
          <svg className="h-3.5 w-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125" />
          </svg>
          <span className="text-[13px] font-medium truncate flex-1">{table.name}</span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {table.columns.length} cols
          </span>
          {table.rowCount >= 0 && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {table.rowCount.toLocaleString()} rows
            </span>
          )}
        </button>
      </div>
      {expanded && (
        <div className="pl-4 pb-1">
          {table.columns.map((col) => (
            <ColumnItem key={col.name} column={col} />
          ))}
        </div>
      )}
    </div>
  );
}
