"use client";

import React, { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "./echarts-core";
import { useEChartsTheme, CHART_COLORS } from "./useEChartsTheme";
import { ChartContainer } from "./ChartContainer";
import { formatValue } from "@/lib/format";
import type { EChartsOption } from "echarts-for-react";

interface AreaChartProps {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  series?: string;
  smooth?: boolean;
  xFmt?: string;
  yFmt?: string;
  stacked?: boolean;
  fillOpacity?: number;
  title?: string;
  subtitle?: string;
  height?: number;
  colorPalette?: string[];
}

export function AreaChart({
  data,
  x,
  y,
  series,
  smooth = false,
  xFmt,
  yFmt,
  stacked = false,
  fillOpacity = 0.3,
  title,
  subtitle,
  height = 400,
  colorPalette,
}: AreaChartProps) {
  const theme = useEChartsTheme();

  const option = useMemo<EChartsOption>(() => {
    if (!data.length) return {};

    const colors = colorPalette ?? [...CHART_COLORS];
    const xValues = [...new Map(data.map((r) => [String(r[x]), true])).keys()];
    const stackLabel = stacked ? "total" : undefined;

    const buildSeries = (): EChartsOption["series"] => {
      if (series) {
        const groups = new Map<string, Record<string, unknown>[]>();
        for (const row of data) {
          const key = String(row[series]);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(row);
        }

        const result: EChartsOption["series"] = [];
        let idx = 0;
        for (const [name, rows] of groups) {
          const lookup = new Map(rows.map((r) => [String(r[x]), r[y]]));
          const color = colors[idx % colors.length]!;
          result.push({
            name,
            type: "line",
            smooth,
            stack: stackLabel,
            areaStyle: { opacity: fillOpacity },
            data: xValues.map((xv) => lookup.get(xv) ?? null),
            itemStyle: { color },
          });
          idx++;
        }
        return result;
      }

      return [
        {
          type: "line",
          smooth,
          stack: stackLabel,
          areaStyle: { opacity: fillOpacity },
          data: data.map((r) => r[y]),
          itemStyle: { color: colors[0] },
        },
      ];
    };

    return {
      tooltip: { trigger: "axis" },
      legend: series ? { show: true } : undefined,
      xAxis: {
        type: "category" as const,
        data: xValues,
        axisLabel: {
          formatter: xFmt ? (v: unknown) => formatValue(v, xFmt) : undefined,
        },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: {
          formatter: yFmt ? (v: unknown) => formatValue(v, yFmt) : undefined,
        },
      },
      series: buildSeries(),
      grid: { left: 48, right: 16, top: 32, bottom: 32, containLabel: true },
    };
  }, [data, x, y, series, smooth, xFmt, yFmt, stacked, fillOpacity, colorPalette]);

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      height={height}
      empty={data.length === 0}
    >
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        theme={theme}
        style={{ height, width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge
      />
    </ChartContainer>
  );
}
