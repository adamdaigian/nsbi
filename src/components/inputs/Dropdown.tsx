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
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <Select value={current} onValueChange={(v) => onChange(v)}>
        <SelectTrigger
          className="h-8 min-w-[120px] rounded-md border border-border bg-accent px-[12px] py-[4px] text-xs text-foreground transition-colors hover:border-border2 focus:border-primary focus:ring-1 focus:ring-primary/40"
        >
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent className="rounded-md border border-border bg-background shadow-lg">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="cursor-pointer text-xs text-foreground focus:bg-accent focus:text-foreground"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
