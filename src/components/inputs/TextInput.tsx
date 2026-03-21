import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useFilterValue } from "./FilterContext";

interface TextInputProps {
  name: string;
  label?: string;
  placeholder?: string;
}

export function TextInput({ name, label, placeholder }: TextInputProps) {
  const { value, onChange } = useFilterValue(name);
  const current = (value as string) ?? "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-[4px]">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <Input
        value={current}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-8 min-w-[120px] rounded-md border border-border bg-accent px-[12px] py-[4px] text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors hover:border-border2 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
      />
    </div>
  );
}
