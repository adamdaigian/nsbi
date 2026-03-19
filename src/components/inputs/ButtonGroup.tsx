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
        <label className="text-xs font-medium text-[#949494]">{label}</label>
      )}
      <div className="inline-flex rounded-md border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.15)]">
        {options.map((opt, idx) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative h-8 px-[12px] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5A7B8F]/40",
              idx === 0 && "rounded-l-md",
              idx === options.length - 1 && "rounded-r-md",
              idx !== 0 && "border-l border-[rgba(148,148,148,0.12)]",
              current === opt.value
                ? "bg-[#5A7B8F]/20 text-[#5A7B8F]"
                : "text-[#949494] hover:bg-[rgba(64,64,64,0.25)] hover:text-[#FFFFFF]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
