"use client";

import React, { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "./echarts-core";
import { useEChartsTheme, CHART_COLORS } from "./useEChartsTheme";
import { ChartContainer } from "./ChartContainer";
import { formatValue } from "@/lib/format";
import type { EChartsOption } from "echarts-for-react";

interface LineChartProps {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  series?: string;
  smooth?: boolean;
  xFmt?: string;
  yFmt?: string;
  y2?: string;
  title?: string;
  subtitle?: string;
  height?: number;
  colorPalette?: string[];
}

export function LineChart({
  data,
  x,
  y,
  series,
  smooth = false,
  xFmt,
  yFmt,
  y2,
  title,
  subtitle,
  height = 400,
  colorPalette,
}: LineChartProps) {
  const theme = useEChartsTheme();

  const option = useMemo<EChartsOption>(() => {
    if (!data.length) return {};

    const colors = colorPalette ?? [...CHART_COLORS];
    const xValues = [...new Map(data.map((r) => [String(r[x]), true])).keys()];

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
          result.push({
            name,
            type: "line",
            smooth,
            data: xValues.map((xv) => lookup.get(xv) ?? null),
            itemStyle: { color: colors[idx % colors.length] },
          });
          idx++;
        }
        return result;
      }

      const seriesArr: EChartsOption["series"] = [
        {
          type: "line",
          smooth,
          data: data.map((r) => r[y]),
          itemStyle: { color: colors[0] },
        },
      ];

      if (y2) {
        seriesArr.push({
          type: "line",
          smooth,
          yAxisIndex: 1,
          data: data.map((r) => r[y2]),
          itemStyle: { color: colors[1] },
        });
      }

      return seriesArr;
    };

    const yAxes: EChartsOption["yAxis"] = [
      {
        type: "value" as const,
        axisLabel: {
          formatter: yFmt ? (v: unknown) => formatValue(v, yFmt) : undefined,
        },
      },
    ];

    if (y2) {
      yAxes.push({
        type: "value" as const,
        axisLabel: {
          formatter: yFmt ? (v: unknown) => formatValue(v, yFmt) : undefined,
        },
      });
    }

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
      yAxis: yAxes,
      series: buildSeries(),
      grid: { left: 48, right: y2 ? 48 : 16, top: 32, bottom: 32, containLabel: true },
    };
  }, [data, x, y, series, smooth, xFmt, yFmt, y2, colorPalette]);

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
