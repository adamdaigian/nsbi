"use client";

import React from "react";
import { Delta } from "./Delta";
import { formatValue } from "@/lib/format";

interface BigValueProps {
  data: Record<string, unknown>[];
  value: string;
  comparison?: string;
  sparklineField?: string;
  format?: string;
  comparisonFormat?: string;
  isUpGood?: boolean;
  title?: string;
  subtitle?: string;
  height?: number;
}

function resolveField(row: Record<string, unknown>, field: string): unknown {
  if (field in row) return row[field];
  const suffix = `__${field}`;
  const key = Object.keys(row).find((k) => k.endsWith(suffix));
  return key ? row[key] : undefined;
}

export function BigValue({
  data,
  value,
  comparison,
  // sparklineField unused until Sparkline is reimplemented (Task 10)
  format,
  comparisonFormat,
  isUpGood = true,
  title,
  subtitle,
  height = 160,
}: BigValueProps) {
  const row = data[0] as Record<string, unknown> | undefined;
  const isEmpty = !row;

  const mainValue = row ? resolveField(row, value) : undefined;
  const compValue =
    row && comparison ? Number(resolveField(row, comparison)) : undefined;

  return (
    <div
      className="rounded-[8px] border border-border bg-card p-4"
      style={{ minHeight: height }}
    >
      {(title || subtitle) && (
        <div className="mb-2">
          {title && <h3 className="text-[13px] font-medium text-foreground">{title}</h3>}
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      {isEmpty ? (
        <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground">
          No data
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <span className="text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground">
            {formatValue(mainValue, format)}
          </span>

          {compValue != null && !Number.isNaN(compValue) && (
            <Delta
              value={compValue}
              format={comparisonFormat}
              isUpGood={isUpGood}
            />
          )}
        </div>
      )}
    </div>
  );
}
