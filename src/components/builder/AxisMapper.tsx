import React from "react";

interface AxisMapperProps {
  label: string;
  value: string;
  columns: string[];
  onChange: (value: string) => void;
  optional?: boolean;
}

export function AxisMapper({ label, value, columns, onChange, optional }: AxisMapperProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <label className="text-[11px] text-[#949494] w-14 shrink-0">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-[rgba(64,64,64,0.15)] rounded px-2 py-1 text-[12px] text-[#FFFFFF] outline-none focus:ring-1 focus:ring-[#5A7B8F]"
      >
        {optional && <option value="">None</option>}
        {!optional && !value && <option value="">Select...</option>}
        {columns.map((col) => (
          <option key={col} value={col}>
            {col}
          </option>
        ))}
      </select>
    </div>
  );
}
