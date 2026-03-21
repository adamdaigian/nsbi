"use client";

import React from "react";
import { formatValue } from "@/lib/format";

interface DeltaProps {
  value: number;
  format?: string;
  isUpGood?: boolean;
}

export function Delta({ value, format, isUpGood = true }: DeltaProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const isGood = isNeutral ? null : isPositive === isUpGood;

  const color = isNeutral
    ? "var(--muted-foreground)"
    : isGood
      ? "var(--green)"
      : "var(--red)";

  const arrow = isPositive ? "\u2191" : isNeutral ? "\u2192" : "\u2193";

  const formatted = formatValue(Math.abs(value), format);

  return (
    <span
      className="inline-flex items-center gap-1 text-[13px] font-medium"
      style={{ color }}
    >
      <span>{arrow}</span>
      <span>{formatted}</span>
    </span>
  );
}
