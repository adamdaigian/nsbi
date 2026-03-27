"use client";

import React from "react";
import { VegaChart } from "@/components/charts/VegaChart";
import { applyPreset } from "@/config/presets";
import { useQueryData } from "./QueryContext";

interface ChartProps {
  data: string;
  x: string;
  y: string;
  color?: string;
  title?: string;
  yFormat?: string;
  xTimeUnit?: string;
}

function buildSpec(
  preset: string,
  { x, y, color, yFormat, xTimeUnit }: Omit<ChartProps, "data" | "title">,
) {
  const xEnc: Record<string, unknown> = { field: x, type: "quantitative" };
  if (xTimeUnit) {
    xEnc.type = "temporal";
    xEnc.timeUnit = xTimeUnit;
    xEnc.title = null;
  }

  const yEnc: Record<string, unknown> = { field: y, type: "quantitative" };
  if (yFormat) {
    yEnc.axis = { format: yFormat };
  }

  const encoding: Record<string, unknown> = { x: xEnc, y: yEnc };
  if (color) {
    encoding.color = { field: color, type: "nominal" };
  }

  return applyPreset(preset, { encoding });
}

export function LineChart({ data, title, ...rest }: ChartProps) {
  const rows = useQueryData(data);
  const spec = buildSpec("line", rest);
  return <VegaChart spec={spec} data={{ table: rows }} title={title} />;
}

export function BarChart({
  data,
  title,
  stack,
  ...rest
}: ChartProps & { stack?: boolean }) {
  const rows = useQueryData(data);
  const preset = stack ? "stacked-column" : "grouped-column";
  const spec = buildSpec(preset, rest);
  return <VegaChart spec={spec} data={{ table: rows }} title={title} />;
}

export function AreaChart({ data, title, ...rest }: ChartProps) {
  const rows = useQueryData(data);
  const spec = buildSpec("stacked-area", rest);
  return <VegaChart spec={spec} data={{ table: rows }} title={title} />;
}
