import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFilterValue } from "./FilterContext";

interface DateInputProps {
  name: string;
  label?: string;
}

export function DateInput({ name, label }: DateInputProps) {
  const { value, onChange } = useFilterValue(name);
  const selected = value as Date | undefined;
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-[4px]">
      {label && (
        <label className="text-xs font-medium text-[#949494]">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-8 min-w-[140px] justify-start rounded-md border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.15)] px-[12px] py-[4px] text-left text-xs font-normal text-[#FFFFFF] transition-colors hover:border-[rgba(148,148,148,0.24)] hover:bg-[rgba(64,64,64,0.25)] focus:border-[#5A7B8F] focus:ring-1 focus:ring-[#5A7B8F]/40",
              !selected && "text-[#949494]",
            )}
          >
            <CalendarIcon className="mr-[8px] h-3.5 w-3.5 text-[#949494]" />
            {selected ? format(selected, "MMM d, yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto rounded-md border border-[rgba(148,148,148,0.12)] bg-[#0A0B0B] p-0 shadow-lg"
          align="start"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            className="text-[#FFFFFF]"
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
