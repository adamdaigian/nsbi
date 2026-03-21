import React, { useMemo, useState } from "react";
import { format, subDays, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFilterValue } from "./FilterContext";

interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DateRangeProps {
  name: string;
  label?: string;
}

const presets = [
  { label: "Last 7 days", from: () => subDays(new Date(), 7), to: () => new Date() },
  { label: "Last 30 days", from: () => subDays(new Date(), 30), to: () => new Date() },
  { label: "This month", from: () => startOfMonth(new Date()), to: () => new Date() },
  { label: "This quarter", from: () => startOfQuarter(new Date()), to: () => new Date() },
  { label: "This year", from: () => startOfYear(new Date()), to: () => new Date() },
] as const;

export function DateRange({ name, label }: DateRangeProps) {
  const { value, onChange } = useFilterValue(name);
  const range = value as DateRangeValue | undefined;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"presets" | "custom">("presets");

  const displayText = useMemo(() => {
    if (!range?.from || !range?.to) return "Select date range";
    return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
  }, [range]);

  const handlePreset = (preset: (typeof presets)[number]) => {
    onChange({ from: preset.from(), to: preset.to() });
    setOpen(false);
  };

  const handleRangeSelect = (selected: { from?: Date; to?: Date } | undefined) => {
    if (selected?.from && selected?.to) {
      onChange({ from: selected.from, to: selected.to });
    } else if (selected?.from) {
      onChange({ from: selected.from, to: selected.from });
    }
  };

  return (
    <div className="flex flex-col gap-[4px]">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-8 min-w-[200px] justify-start rounded-md border border-border bg-accent px-[12px] py-[4px] text-left text-xs font-normal text-foreground transition-colors hover:border-border2 hover:bg-accent/80 focus:border-primary focus:ring-1 focus:ring-primary/40",
              !range && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-[8px] h-3.5 w-3.5 text-muted-foreground" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto rounded-md border border-border bg-background p-0 shadow-lg"
          align="start"
        >
          <div className="flex">
            {/* Preset sidebar */}
            <div className="flex flex-col border-r border-border p-[8px]">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className="rounded px-[12px] py-[4px] text-left text-xs text-foreground transition-colors hover:bg-accent"
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => setMode("custom")}
                className={cn(
                  "rounded px-[12px] py-[4px] text-left text-xs transition-colors hover:bg-accent",
                  mode === "custom" ? "text-primary" : "text-foreground",
                )}
              >
                Custom
              </button>
            </div>

            {/* Calendar — only shown in custom mode */}
            {mode === "custom" && (
              <div className="p-[8px]">
                <Calendar
                  mode="range"
                  selected={
                    range
                      ? { from: range.from, to: range.to }
                      : undefined
                  }
                  onSelect={(selected) =>
                    handleRangeSelect(
                      selected as { from?: Date; to?: Date } | undefined,
                    )
                  }
                  numberOfMonths={2}
                  className="text-foreground"
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
