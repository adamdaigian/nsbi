import React, { useState, useMemo } from "react";
import { useSchema } from "./SchemaContext";
import { TableItem } from "./TableItem";

export function SchemaExplorer() {
  const { schema, loading, error, refresh } = useSchema();
  const [search, setSearch] = useState("");

  const filteredTables = useMemo(() => {
    if (!schema) return [];
    if (!search.trim()) return schema.tables;
    const q = search.toLowerCase();
    return schema.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.columns.some((c) => c.name.toLowerCase().includes(q)),
    );
  }, [schema, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">Schema</span>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          title="Refresh schema"
        >
          <svg
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 14.652" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border/70">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tables & columns..."
          className="w-full bg-accent rounded px-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && !schema && (
          <div className="flex items-center justify-center py-8">
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {error && (
          <div className="px-3 py-3 text-[12px] text-destructive">{error}</div>
        )}

        {schema && filteredTables.length === 0 && (
          <div className="px-3 py-4 text-[12px] text-muted-foreground text-center">
            {search ? "No matching tables" : "No tables found"}
          </div>
        )}

        {filteredTables.map((table) => (
          <TableItem key={table.name} table={table} />
        ))}
      </div>

      {/* Footer */}
      {schema && (
        <div className="px-3 py-1.5 border-t border-border/70 text-[10px] text-muted-foreground">
          {schema.tables.length} table{schema.tables.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
