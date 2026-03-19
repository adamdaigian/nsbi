"use client";

import React, { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "./echarts-core";
import { useEChartsTheme, CHART_COLORS } from "./useEChartsTheme";
import type { EChartsOption } from "echarts-for-react";

interface SparklineProps {
  data: Record<string, unknown>[];
  y: string;
  height?: number;
  width?: number;
  color?: string;
}

export function Sparkline({
  data,
  y,
  height = 32,
  width = 120,
  color,
}: SparklineProps) {
  const theme = useEChartsTheme();

  const option = useMemo<EChartsOption>(() => {
    const values = data.map((r) => Number(r[y]) || 0);

    return {
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { type: "category", show: false, data: values.map((_, i) => i) },
      yAxis: { type: "value", show: false },
      tooltip: { show: false },
      series: [
        {
          type: "line",
          data: values,
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 1.5, color: color ?? CHART_COLORS[0] },
          areaStyle: { opacity: 0.1, color: color ?? CHART_COLORS[0] },
          itemStyle: { color: color ?? CHART_COLORS[0] },
        },
      ],
    };
  }, [data, y, color]);

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      theme={theme}
      style={{ height, width }}
      opts={{ renderer: "canvas" }}
      notMerge
    />
  );
}
