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
        <label className="text-xs font-medium text-[#949494]">{label}</label>
      )}
      <Input
        value={current}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-8 min-w-[120px] rounded-md border border-[rgba(148,148,148,0.12)] bg-[rgba(64,64,64,0.15)] px-[12px] py-[4px] text-xs text-[#FFFFFF] placeholder:text-[#949494]/60 transition-colors hover:border-[rgba(148,148,148,0.24)] focus-visible:border-[#5A7B8F] focus-visible:ring-1 focus-visible:ring-[#5A7B8F]/40"
      />
    </div>
  );
}
