import React, { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterValue } from "./FilterContext";

interface DropdownProps {
  name: string;
  label?: string;
  options: { label: string; value: string }[];
  defaultValue?: string;
}

export function Dropdown({ name, label, options, defaultValue }: DropdownProps) {
  const { value, onChange } = useFilterValue(name);
  const current = (value as string) ?? defaultValue ?? "";

  // Seed the filter context with defaultValue on mount
  useEffect(() => {
    if (value === undefined && defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, []);

  return (
    <div className="flex flex-col gap-[4px]">
      {label && (
        <label className="text-xs font-medium text-[#949494]">{label}</label>
      )}
      <Select value={current} onValueChange={(v) => onChange(v)}>
        <SelectTrigger
          className="h-8 min-w-[120px] rounded-md border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.15)] px-[12px] py-[4px] text-xs text-[#FFFFFF] transition-colors hover:border-[rgba(148,148,148,0.24)] focus:border-[#5A7B8F] focus:ring-1 focus:ring-[#5A7B8F]/40"
        >
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent className="rounded-md border border-[rgba(148,148,148,0.12)] bg-[#0A0B0B] shadow-lg">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="cursor-pointer text-xs text-[#FFFFFF] focus:bg-[rgba(64,64,64,0.15)] focus:text-[#FFFFFF]"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
