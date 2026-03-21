import React from "react";
import { cn } from "@/lib/utils";
import { useFilterValue } from "./FilterContext";

interface ButtonGroupProps {
  name: string;
  label?: string;
  options: { label: string; value: string }[];
}

export function ButtonGroup({ name, label, options }: ButtonGroupProps) {
  const { value, onChange } = useFilterValue(name);
  const current = value as string | undefined;

  return (
    <div className="flex flex-col gap-[4px]">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <div className="inline-flex rounded-md border border-border bg-accent">
        {options.map((opt, idx) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative h-8 px-[12px] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
              idx === 0 && "rounded-l-md",
              idx === options.length - 1 && "rounded-r-md",
              idx !== 0 && "border-l border-border",
              current === opt.value
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
