import React from "react";
import type { ChartType } from "@/builder/types";

export interface ChartVariant {
  type: ChartType;
  label: string;
  /** Props automatically applied when this variant is selected */
  impliedProps: Record<string, unknown>;
}

const CHART_VARIANTS: ChartVariant[] = [
  { type: "BarChart", label: "Bar", impliedProps: {} },
  { type: "BarChart", label: "Stacked Bar", impliedProps: { stacked: true } },
  { type: "BarChart", label: "Horizontal Bar", impliedProps: { horizontal: true } },
  { type: "LineChart", label: "Line", impliedProps: {} },
  { type: "AreaChart", label: "Area", impliedProps: {} },
  { type: "AreaChart", label: "Stacked Area", impliedProps: { stacked: true } },
  { type: "ScatterPlot", label: "Scatter", impliedProps: {} },
  { type: "DataTable", label: "Table", impliedProps: {} },
  { type: "BigValue", label: "KPI", impliedProps: {} },
  { type: "Sparkline", label: "Sparkline", impliedProps: {} },
];

interface ChartTypeSelectorProps {
  selected: ChartVariant | null;
  onSelect: (variant: ChartVariant) => void;
}

export function ChartTypeSelector({ selected, onSelect }: ChartTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {CHART_VARIANTS.map((variant) => {
        const key = `${variant.type}-${variant.label}`;
        const isSelected = selected && selected.type === variant.type && selected.label === variant.label;
        return (
          <button
            key={key}
            onClick={() => onSelect(variant)}
            className={`px-2 py-1 rounded text-[11px] transition-colors ${
              isSelected
                ? "bg-[rgba(90,123,143,0.2)] text-[#5A7B8F] ring-1 ring-[#5A7B8F]"
                : "bg-[rgba(64,64,64,0.1)] text-[#949494] hover:bg-[rgba(64,64,64,0.2)] hover:text-[#FFFFFF]"
            }`}
          >
            {variant.label}
          </button>
        );
      })}
    </div>
  );
}
