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
    ? "#949494"
    : isGood
      ? "hsl(142,71%,45%)"
      : "hsl(0,84%,60%)";

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
