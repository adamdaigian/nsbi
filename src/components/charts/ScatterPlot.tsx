"use client";

import React, { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "./echarts-core";
import { useEChartsTheme, CHART_COLORS } from "./useEChartsTheme";
import { ChartContainer } from "./ChartContainer";
import type { EChartsOption } from "echarts-for-react";

interface ScatterPlotProps {
  data: Record<string, unknown>[];
  x: string;
  y: string;
  series?: string;
  size?: string;
  title?: string;
  subtitle?: string;
  height?: number;
  colorPalette?: string[];
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function ScatterPlot({
  data,
  x,
  y,
  series,
  size,
  title,
  subtitle,
  height = 400,
  colorPalette,
}: ScatterPlotProps) {
  const theme = useEChartsTheme();

  const option = useMemo<EChartsOption>(() => {
    if (!data.length) return {};

    const colors = colorPalette ?? [...CHART_COLORS];

    let sizeMin = Infinity;
    let sizeMax = -Infinity;
    if (size) {
      for (const row of data) {
        const v = Number(row[size]);
        if (!Number.isFinite(v)) continue;
        if (v < sizeMin) sizeMin = v;
        if (v > sizeMax) sizeMax = v;
      }
    }
    const sizeRange = sizeMax - sizeMin || 1;

    const symbolSizeFn = size
      ? (row: [number, number, number]) => {
          const norm = (row[2] - sizeMin) / sizeRange;
          return clamp(norm * 40 + 4, 4, 48);
        }
      : 8;

    const buildSeries = (): EChartsOption["series"] => {
      if (series) {
        const groups = new Map<string, [number, number, number?][]>();
        for (const row of data) {
          const key = String(row[series]);
          if (!groups.has(key)) groups.set(key, []);
          const entry: [number, number, number?] = [Number(row[x]), Number(row[y])];
          if (size) entry.push(Number(row[size]));
          groups.get(key)!.push(entry);
        }

        const result: EChartsOption["series"] = [];
        let idx = 0;
        for (const [name, points] of groups) {
          result.push({
            name,
            type: "scatter",
            data: points,
            symbolSize: symbolSizeFn,
            itemStyle: { color: colors[idx % colors.length] },
          });
          idx++;
        }
        return result;
      }

      const points = data.map((row) => {
        const entry: (number | undefined)[] = [Number(row[x]), Number(row[y])];
        if (size) entry.push(Number(row[size]));
        return entry;
      });

      return [
        {
          type: "scatter",
          data: points,
          symbolSize: symbolSizeFn,
          itemStyle: { color: colors[0] },
        },
      ];
    };

    return {
      tooltip: {
        trigger: "item",
        formatter: (params: { value: number[] }) => {
          const v = params.value;
          let text = `${x}: ${v[0]}<br/>${y}: ${v[1]}`;
          if (size && v[2] != null) text += `<br/>${size}: ${v[2]}`;
          return text;
        },
      },
      legend: series ? { show: true } : undefined,
      xAxis: { type: "value" as const, name: x },
      yAxis: { type: "value" as const, name: y },
      series: buildSeries(),
      grid: { left: 48, right: 16, top: 32, bottom: 32, containLabel: true },
    };
  }, [data, x, y, series, size, colorPalette]);

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
