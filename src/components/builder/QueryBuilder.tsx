import React, { useState } from "react";
import type { QuerySpec } from "@/builder/types";
import type { SchemaMetadata } from "@/types/schema";

interface QueryBuilderProps {
  query: QuerySpec;
  schema: SchemaMetadata | null;
  onChange: (query: QuerySpec) => void;
}

export function QueryBuilder({ query, schema, onChange }: QueryBuilderProps) {
  const [sqlMode, setSqlMode] = useState(query.type === "sql");

  const tables = schema?.tables ?? [];

  if (sqlMode) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#949494]">SQL Query</span>
          <button
            onClick={() => setSqlMode(false)}
            className="text-[10px] text-[#5A7B8F] hover:text-[#FFFFFF]"
          >
            Switch to builder
          </button>
        </div>
        <input
          type="text"
          value={query.name}
          onChange={(e) => onChange({ ...query, name: e.target.value })}
          placeholder="Query name"
          className="bg-[rgba(64,64,64,0.15)] rounded px-2 py-1 text-[12px] text-[#FFFFFF] placeholder:text-[#666] outline-none focus:ring-1 focus:ring-[#5A7B8F]"
        />
        <textarea
          value={query.sql ?? ""}
          onChange={(e) => onChange({ ...query, type: "sql", sql: e.target.value })}
          placeholder="SELECT ..."
          rows={6}
          className="bg-[rgba(64,64,64,0.15)] rounded px-2 py-1.5 text-[12px] text-[#FFFFFF] placeholder:text-[#666] outline-none focus:ring-1 focus:ring-[#5A7B8F] font-mono resize-y"
        />
      </div>
    );
  }

  // Visual query builder
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [aggregation, setAggregation] = useState("none");
  const [groupBy, setGroupBy] = useState("");

  const tableSchema = tables.find((t) => t.name === selectedTable);

  const generateSQL = () => {
    if (!selectedTable || selectedColumns.length === 0) return "";
    let cols = selectedColumns.join(", ");
    if (aggregation !== "none" && groupBy) {
      const aggCols = selectedColumns
        .filter((c) => c !== groupBy)
        .map((c) => `${aggregation}(${c}) as ${c}`);
      cols = [groupBy, ...aggCols].join(", ");
      return `SELECT ${cols}\nFROM ${selectedTable}\nGROUP BY ${groupBy}\nORDER BY ${groupBy}`;
    }
    return `SELECT ${cols}\nFROM ${selectedTable}\nLIMIT 1000`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#949494]">Query Builder</span>
        <button
          onClick={() => {
            const sql = generateSQL();
            if (sql) onChange({ ...query, type: "sql", sql });
            setSqlMode(true);
          }}
          className="text-[10px] text-[#5A7B8F] hover:text-[#FFFFFF]"
        >
          Switch to SQL
        </button>
      </div>
      <input
        type="text"
        value={query.name}
        onChange={(e) => onChange({ ...query, name: e.target.value })}
        placeholder="Query name"
        className="bg-[rgba(64,64,64,0.15)] rounded px-2 py-1 text-[12px] text-[#FFFFFF] placeholder:text-[#666] outline-none focus:ring-1 focus:ring-[#5A7B8F]"
      />
      <select
        value={selectedTable}
        onChange={(e) => {
          setSelectedTable(e.target.value);
          setSelectedColumns([]);
        }}
        className="bg-[rgba(64,64,64,0.15)] rounded px-2 py-1 text-[12px] text-[#FFFFFF] outline-none focus:ring-1 focus:ring-[#5A7B8F]"
      >
        <option value="">Select table...</option>
        {tables.map((t) => (
          <option key={t.name} value={t.name}>{t.name}</option>
        ))}
      </select>

      {tableSchema && (
        <>
          <div className="text-[11px] text-[#949494]">Columns</div>
          <div className="max-h-[120px] overflow-y-auto space-y-0.5">
            {tableSchema.columns.map((col) => (
              <label key={col.name} className="flex items-center gap-1.5 text-[11px] text-[#FFFFFF] cursor-pointer hover:bg-[rgba(64,64,64,0.1)] rounded px-1">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col.name)}
                  onChange={(e) => {
                    setSelectedColumns(
                      e.target.checked
                        ? [...selectedColumns, col.name]
                        : selectedColumns.filter((c) => c !== col.name),
                    );
                  }}
                  className="rounded border-[#666]"
                />
                <span>{col.name}</span>
                <span className="text-[10px] text-[#666] ml-auto">{col.type}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
              className="flex-1 bg-[rgba(64,64,64,0.15)] rounded px-2 py-1 text-[11px] text-[#FFFFFF] outline-none"
            >
              <option value="none">No aggregation</option>
              <option value="SUM">SUM</option>
              <option value="AVG">AVG</option>
              <option value="COUNT">COUNT</option>
              <option value="MIN">MIN</option>
              <option value="MAX">MAX</option>
            </select>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="flex-1 bg-[rgba(64,64,64,0.15)] rounded px-2 py-1 text-[11px] text-[#FFFFFF] outline-none"
            >
              <option value="">Group by...</option>
              {selectedColumns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              const sql = generateSQL();
              if (sql) onChange({ ...query, type: "sql", sql });
            }}
            disabled={!selectedTable || selectedColumns.length === 0}
            className="text-[11px] px-2 py-1 rounded bg-[rgba(90,123,143,0.15)] text-[#5A7B8F] hover:bg-[rgba(90,123,143,0.25)] disabled:opacity-50 transition-colors"
          >
            Generate SQL
          </button>
        </>
      )}
    </div>
  );
}
