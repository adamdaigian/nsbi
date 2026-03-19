"use client";

import React, { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "./echarts-core";
import { useEChartsTheme } from "./useEChartsTheme";
import { ChartContainer } from "./ChartContainer";
import type { EChartsOption } from "echarts-for-react";

interface EChartsRawProps {
  options: EChartsOption;
  title?: string;
  subtitle?: string;
  height?: number;
  notMerge?: boolean;
}

export function EChartsRaw({
  options,
  title,
  subtitle,
  height = 400,
  notMerge = false,
}: EChartsRawProps) {
  const theme = useEChartsTheme();

  const merged = useMemo<EChartsOption>(() => {
    return {
      ...options,
    };
  }, [options]);

  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <ReactEChartsCore
        echarts={echarts}
        option={merged}
        theme={theme}
        style={{ height, width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={notMerge}
      />
    </ChartContainer>
  );
}
