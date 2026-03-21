import React, { useState } from "react";
import type { TableColumn } from "@/types/schema";

const TYPE_COLORS: Record<string, string> = {
  INTEGER: "bg-blue-500/20 text-blue-400",
  BIGINT: "bg-blue-500/20 text-blue-400",
  SMALLINT: "bg-blue-500/20 text-blue-400",
  TINYINT: "bg-blue-500/20 text-blue-400",
  HUGEINT: "bg-blue-500/20 text-blue-400",
  DOUBLE: "bg-purple-500/20 text-purple-400",
  FLOAT: "bg-purple-500/20 text-purple-400",
  DECIMAL: "bg-purple-500/20 text-purple-400",
  VARCHAR: "bg-green-500/20 text-green-400",
  TEXT: "bg-green-500/20 text-green-400",
  DATE: "bg-amber-500/20 text-amber-400",
  TIMESTAMP: "bg-amber-500/20 text-amber-400",
  "TIMESTAMP WITH TIME ZONE": "bg-amber-500/20 text-amber-400",
  TIME: "bg-amber-500/20 text-amber-400",
  BOOLEAN: "bg-rose-500/20 text-rose-400",
  BLOB: "bg-gray-500/20 text-gray-400",
};

function getTypeColor(type: string): string {
  const upper = type.toUpperCase();
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (upper.startsWith(key)) return color;
  }
  return "bg-gray-500/20 text-gray-400";
}

function getShortType(type: string): string {
  const upper = type.toUpperCase();
  if (upper.startsWith("TIMESTAMP")) return "TS";
  if (upper === "VARCHAR" || upper === "TEXT") return "STR";
  if (upper === "BOOLEAN") return "BOOL";
  if (upper === "INTEGER") return "INT";
  if (upper === "BIGINT") return "BIG";
  if (upper === "SMALLINT") return "SM";
  if (upper === "DOUBLE" || upper === "FLOAT") return "FLT";
  if (upper.startsWith("DECIMAL")) return "DEC";
  if (upper === "DATE") return "DATE";
  if (upper === "TIME") return "TIME";
  return type.substring(0, 4).toUpperCase();
}

interface ColumnItemProps {
  column: TableColumn;
}

export function ColumnItem({ column }: ColumnItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(column.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 w-full px-3 py-1 text-left text-[12px] hover:bg-[rgba(64,64,64,0.15)] rounded transition-colors group"
      title={`${column.type}${column.nullable ? " (nullable)" : ""} — click to copy`}
    >
      <span
        className={`inline-flex items-center justify-center w-[34px] shrink-0 rounded px-1 py-0.5 text-[10px] font-mono font-medium ${getTypeColor(column.type)}`}
      >
        {getShortType(column.type)}
      </span>
      <span className="text-[#949494] truncate flex-1">{column.name}</span>
      {column.nullable && (
        <span className="text-[10px] text-[#666] shrink-0">?</span>
      )}
      <span className="text-[10px] text-[#5A7B8F] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">
        {copied ? "copied!" : "copy"}
      </span>
    </button>
  );
}
