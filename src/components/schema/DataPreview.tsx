import React, { useState, useEffect } from "react";
import { useQueryEngine } from "@/engine/EngineContext";

interface DataPreviewProps {
  tableName: string;
}

export function DataPreview({ tableName }: DataPreviewProps) {
  const engine = useQueryEngine();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPreview() {
      setLoading(true);
      setError(null);
      try {
        const result = await engine.executeQuery(
          `SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT 100`,
        );
        if (cancelled) return;
        setRows(result.rows);
        setColumns(result.rows.length > 0 ? Object.keys(result.rows[0]!) : result.columns.map((c) => c.name));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPreview();
    return () => { cancelled = true; };
  }, [tableName, engine]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No data in {tableName}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{tableName}</span>
          <span className="text-xs text-muted-foreground">
            {rows.length >= 100 ? "100+" : rows.length} rows
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-foreground whitespace-nowrap max-w-[300px] truncate">
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
