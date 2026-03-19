"use client";

import React from "react";
import { ChartContainer } from "./ChartContainer";
import { Delta } from "./Delta";
import { Sparkline } from "./Sparkline";
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
  sparklineField,
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
    <ChartContainer
      title={title}
      subtitle={subtitle}
      height={height}
      empty={isEmpty}
    >
      <div className="flex flex-col items-start gap-2">
        <span className="text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#FFFFFF]">
          {formatValue(mainValue, format)}
        </span>

        {compValue != null && !Number.isNaN(compValue) && (
          <Delta
            value={compValue}
            format={comparisonFormat}
            isUpGood={isUpGood}
          />
        )}

        {sparklineField && data.length > 1 && (
          <div className="mt-2">
            <Sparkline data={data} y={sparklineField} width={120} height={32} />
          </div>
        )}
      </div>
    </ChartContainer>
  );
}
