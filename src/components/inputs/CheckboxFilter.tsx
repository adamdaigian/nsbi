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
        className="h-4 w-4 rounded-sm border-border transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-foreground hover:border-border2 focus-visible:ring-1 focus-visible:ring-primary/40"
      />
      {label && (
        <label
          className="cursor-pointer select-none text-xs font-medium text-foreground transition-colors hover:text-muted-foreground"
          onClick={() => onChange(!checked)}
        >
          {label}
        </label>
      )}
    </div>
  );
}
