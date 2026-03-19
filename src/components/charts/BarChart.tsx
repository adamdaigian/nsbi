"use client";

import React, { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "./echarts-core";
import { useEChartsTheme, CHART_COLORS } from "./useEChartsTheme";
import { ChartContainer } from "./ChartContainer";
import { formatValue } from "@/lib/format";
import type { EChartsOption } from "echarts-for-react";

interface BarChartProps {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  series?: string;
  horizontal?: boolean;
  stacked?: boolean;
  sort?: "asc" | "desc";
  labels?: boolean;
  xFmt?: string;
  yFmt?: string;
  title?: string;
  subtitle?: string;
  height?: number;
  colorPalette?: string[];
}

export function BarChart({
  data,
  x,
  y,
  series,
  horizontal = false,
  stacked = false,
  sort,
  labels = false,
  xFmt,
  yFmt,
  title,
  subtitle,
  height = 400,
  colorPalette,
}: BarChartProps) {
  const theme = useEChartsTheme();

  const option = useMemo<EChartsOption>(() => {
    if (!data.length) return {};

    const colors = colorPalette ?? [...CHART_COLORS];

    const sorted = [...data].sort((a, b) => {
      if (sort === "asc") return Number(a[y]) - Number(b[y]);
      if (sort === "desc") return Number(b[y]) - Number(a[y]);
      return 0;
    });

    const xValues = [...new Map(sorted.map((r) => [String(r[x]), true])).keys()];
    const stackLabel = stacked ? "total" : undefined;

    const labelOption = labels
      ? { show: true, color: "#949494", fontSize: 11 }
      : undefined;

    const buildSeries = (): EChartsOption["series"] => {
      if (series) {
        const groups = new Map<string, Record<string, unknown>[]>();
        for (const row of sorted) {
          const key = String(row[series]);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(row);
        }

        const result: EChartsOption["series"] = [];
        let idx = 0;
        for (const [name, rows] of groups) {
          const lookup = new Map(rows.map((r) => [String(r[x]), r[y]]));
          result.push({
            name,
            type: "bar",
            stack: stackLabel,
            data: xValues.map((xv) => lookup.get(xv) ?? null),
            itemStyle: { color: colors[idx % colors.length] },
            label: labelOption,
          });
          idx++;
        }
        return result;
      }

      return [
        {
          type: "bar",
          data: sorted.map((r) => r[y]),
          itemStyle: { color: colors[0] },
          label: labelOption,
        },
      ];
    };

    const categoryAxis = {
      type: "category" as const,
      data: xValues,
      axisLabel: {
        formatter: xFmt ? (v: unknown) => formatValue(v, xFmt) : undefined,
      },
    };

    const valueAxis = {
      type: "value" as const,
      axisLabel: {
        formatter: yFmt ? (v: unknown) => formatValue(v, yFmt) : undefined,
      },
    };

    return {
      tooltip: { trigger: "axis" },
      legend: series ? { show: true } : undefined,
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: buildSeries(),
      grid: { left: 48, right: 16, top: 32, bottom: 32, containLabel: true },
    };
  }, [data, x, y, series, horizontal, stacked, sort, labels, xFmt, yFmt, colorPalette]);

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
