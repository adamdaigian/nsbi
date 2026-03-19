"use client";

import React, { type ComponentType } from "react";
import { useQueryData } from "./QueryContext";

/**
 * HOC that wraps a chart component so its `data` prop can be either:
 *  - a string  → resolved from QueryContext via useQueryData(name).rows
 *  - an array  → passed through directly
 */
export function withQueryData<P extends { data: Record<string, unknown>[] }>(
  Chart: ComponentType<P>,
): ComponentType<Omit<P, "data"> & { data: string | Record<string, unknown>[] }> {
  function DataAwareChart(props: Omit<P, "data"> & { data: string | Record<string, unknown>[] }) {
    const { data: dataProp, ...rest } = props;

    if (typeof dataProp === "string") {
      return <StringDataChart Chart={Chart} queryName={dataProp} rest={rest} />;
    }

    return <Chart {...({ data: dataProp, ...rest } as unknown as P)} />;
  }

  DataAwareChart.displayName = `withQueryData(${Chart.displayName ?? Chart.name ?? "Chart"})`;
  return DataAwareChart;
}

function StringDataChart<P extends { data: Record<string, unknown>[] }>({
  Chart,
  queryName,
  rest,
}: {
  Chart: ComponentType<P>;
  queryName: string;
  rest: Record<string, unknown>;
}) {
  const result = useQueryData(queryName);

  if (result.loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "#5A7B8F", borderTopColor: "transparent" }}
        />
        <span className="ml-2 text-xs" style={{ color: "#949494" }}>
          Loading {queryName}...
        </span>
      </div>
    );
  }

  if (result.error) {
    return (
      <div
        className="rounded p-3 text-xs"
        style={{
          border: "1px solid rgba(248,113,113,0.2)",
          backgroundColor: "rgba(248,113,113,0.1)",
          color: "#f87171",
        }}
      >
        Query &ldquo;{queryName}&rdquo; failed: {result.error}
      </div>
    );
  }

  return <Chart {...({ data: result.rows, ...rest } as unknown as P)} />;
}
