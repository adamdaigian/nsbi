import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useFilterValue } from "./FilterContext";

interface MultiSelectProps {
  name: string;
  label?: string;
  options: { label: string; value: string }[];
}

export function MultiSelect({ name, label, options }: MultiSelectProps) {
  const { value, onChange } = useFilterValue(name);
  const selected = (value as string[]) ?? [];
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(next);
  };

  const removeTag = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== val));
  };

  const displayLabel = () => {
    if (selected.length === 0) return "Select...";
    if (selected.length <= 2) {
      return selected
        .map((v) => options.find((o) => o.value === v)?.label ?? v)
        .join(", ");
    }
    return `${selected.length} selected`;
  };

  return (
    <div className="flex flex-col gap-[4px]" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium text-[#949494]">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex h-8 w-full min-w-[160px] items-center justify-between rounded-md border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.15)] px-[12px] py-[4px] text-left text-xs transition-colors hover:border-[rgba(148,148,148,0.24)] focus-visible:outline-none focus-visible:border-[#5A7B8F] focus-visible:ring-1 focus-visible:ring-[#5A7B8F]/40",
            selected.length > 0 ? "text-[#FFFFFF]" : "text-[#949494]",
          )}
        >
          <span className="truncate">{displayLabel()}</span>
          <ChevronDown className="ml-[8px] h-3.5 w-3.5 shrink-0 text-[#949494]" />
        </button>

        {open && (
          <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-[240px] w-full min-w-[160px] overflow-y-auto rounded-md border border-[rgba(148,148,148,0.12)] bg-[#0A0B0B] p-[4px] shadow-lg">
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-[8px] rounded px-[8px] py-[4px] text-left text-xs text-[#FFFFFF] transition-colors hover:bg-[rgba(64,64,64,0.15)]"
                >
                  <Checkbox
                    checked={checked}
                    className="h-3.5 w-3.5 rounded-sm border-[rgba(148,148,148,0.12)] data-[state=checked]:border-[#5A7B8F] data-[state=checked]:bg-[#5A7B8F]"
                    tabIndex={-1}
                  />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-[4px]">
          {selected.map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <span
                key={val}
                className="inline-flex items-center gap-[4px] rounded bg-[#5A7B8F]/20 px-[8px] py-[2px] text-[10px] text-[#5A7B8F]"
              >
                {opt?.label ?? val}
                <button
                  type="button"
                  onClick={(e) => removeTag(val, e)}
                  className="rounded-sm transition-colors hover:text-[#FFFFFF]"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
