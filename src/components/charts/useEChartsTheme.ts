"use client";

import { useMemo } from "react";

/**
 * Northstar design-system chart tokens.
 */
const CHART_COLORS = [
  "#5A7B8F", // chart-1  Soft Blue
  "#8B7BA8", // chart-2  Lavender
  "#2C4A5A", // chart-3  Deep Teal
  "#949494", // chart-4  Cyber Silber
  "#6B8E9F", // chart-5  Additional
] as const;

const FONT_FAMILY = "var(--font-geist-sans), system-ui, sans-serif";

/**
 * Returns a memoised ECharts theme object derived from the Northstar design
 * tokens. Pass it as the `theme` prop on `<ReactECharts>`.
 */
export function useEChartsTheme() {
  return useMemo(
    () => ({
      color: [...CHART_COLORS],

      backgroundColor: "transparent",

      textStyle: {
        color: "#949494",
        fontFamily: FONT_FAMILY,
      },

      title: {
        textStyle: {
          color: "#FFFFFF",
          fontFamily: FONT_FAMILY,
        },
        subtextStyle: {
          color: "#949494",
          fontFamily: FONT_FAMILY,
        },
      },

      legend: {
        textStyle: {
          color: "#949494",
          fontFamily: FONT_FAMILY,
        },
      },

      tooltip: {
        backgroundColor: "#1A1A1A",
        borderColor: "rgba(148,148,148,0.12)",
        textStyle: {
          color: "#FFFFFF",
          fontFamily: FONT_FAMILY,
        },
      },

      categoryAxis: {
        axisLine: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        axisLabel: {
          color: "#949494",
          fontFamily: FONT_FAMILY,
        },
        axisTick: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        splitLine: {
          lineStyle: { color: "rgba(148,148,148,0.06)" },
        },
      },

      valueAxis: {
        axisLine: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        axisLabel: {
          color: "#949494",
          fontFamily: FONT_FAMILY,
        },
        axisTick: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        splitLine: {
          lineStyle: { color: "rgba(148,148,148,0.06)" },
        },
      },

      xAxis: {
        axisLine: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        axisLabel: {
          color: "#949494",
          fontFamily: FONT_FAMILY,
        },
        axisTick: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        splitLine: {
          lineStyle: { color: "rgba(148,148,148,0.06)" },
        },
      },

      yAxis: {
        axisLine: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        axisLabel: {
          color: "#949494",
          fontFamily: FONT_FAMILY,
        },
        axisTick: {
          lineStyle: { color: "rgba(148,148,148,0.12)" },
        },
        splitLine: {
          lineStyle: { color: "rgba(148,148,148,0.06)" },
        },
      },
    }),
    [],
  );
}

export { CHART_COLORS };
