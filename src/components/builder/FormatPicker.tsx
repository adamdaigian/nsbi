import React from "react";

const FORMAT_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "usd0", label: "$1,234" },
  { value: "usd2", label: "$1,234.56" },
  { value: "pct", label: "12.3%" },
  { value: "pct0", label: "12%" },
  { value: "num0", label: "1,234" },
  { value: "num2", label: "1,234.56" },
  { value: "date", label: "2024-01-01" },
  { value: "datetime", label: "2024-01-01 12:00" },
];

interface FormatPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function FormatPicker({ label, value, onChange }: FormatPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <label className="text-[11px] text-[#949494] w-14 shrink-0">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-[rgba(64,64,64,0.15)] rounded px-2 py-1 text-[12px] text-[#FFFFFF] outline-none focus:ring-1 focus:ring-[#5A7B8F]"
      >
        {FORMAT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
