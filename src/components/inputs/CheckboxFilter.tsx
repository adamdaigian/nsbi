import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFilterValue } from "./FilterContext";

interface CheckboxFilterProps {
  name: string;
  label?: string;
}

export function CheckboxFilter({ name, label }: CheckboxFilterProps) {
  const { value, onChange } = useFilterValue(name);
  const checked = (value as boolean) ?? false;

  return (
    <div className="flex items-center gap-[8px]">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="h-4 w-4 rounded-sm border-[rgba(148,148,148,0.12)] transition-colors data-[state=checked]:border-[#5A7B8F] data-[state=checked]:bg-[#5A7B8F] data-[state=checked]:text-[#FFFFFF] hover:border-[rgba(148,148,148,0.24)] focus-visible:ring-1 focus-visible:ring-[#5A7B8F]/40"
      />
      {label && (
        <label
          className="cursor-pointer select-none text-xs font-medium text-[#FFFFFF] transition-colors hover:text-[#949494]"
          onClick={() => onChange(!checked)}
        >
          {label}
        </label>
      )}
    </div>
  );
}
