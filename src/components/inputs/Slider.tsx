import React, { useCallback, useRef, useMemo } from "react";
import { useFilterValue } from "./FilterContext";

interface SliderProps {
  name: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
}

export function Slider({ name, label, min, max, step = 1 }: SliderProps) {
  const { value, onChange } = useFilterValue(name);
  const current = (value as number) ?? min;
  const trackRef = useRef<HTMLDivElement>(null);

  const percent = useMemo(() => {
    if (max === min) return 0;
    return ((current - min) / (max - min)) * 100;
  }, [current, min, max]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-[4px]">
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <div className="flex items-center gap-[8px]">
        <div className="relative flex-1" ref={trackRef}>
          <div className="pointer-events-none absolute top-1/2 h-[4px] w-full -translate-y-1/2 rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${percent}%` }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={current}
            onChange={handleChange}
            className="relative z-10 h-[16px] w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:h-[12px] [&::-moz-range-thumb]:w-[12px] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:transition-colors hover:[&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-0 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:h-[12px] [&::-webkit-slider-thumb]:w-[12px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:transition-colors hover:[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-runnable-track]:h-0 [&::-webkit-slider-runnable-track]:bg-transparent"
          />
        </div>
        <span className="min-w-[32px] text-right text-xs tabular-nums text-muted-foreground">
          {current}
        </span>
      </div>
    </div>
  );
}
