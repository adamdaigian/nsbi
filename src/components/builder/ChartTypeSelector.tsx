import React from "react";
import type { ChartType } from "@/builder/types";

export interface ChartVariant {
  type: ChartType | "DataTable" | "BigValue";
  label: string;
  /** Props automatically applied when this variant is selected */
  impliedProps: Record<string, unknown>;
}

const CHART_VARIANTS: ChartVariant[] = [
  { type: "grouped-column", label: "Column", impliedProps: {} },
  { type: "stacked-column", label: "Stacked Column", impliedProps: {} },
  { type: "grouped-bar", label: "Bar", impliedProps: {} },
  { type: "stacked-bar", label: "Stacked Bar", impliedProps: {} },
  { type: "line", label: "Line", impliedProps: {} },
  { type: "stacked-area", label: "Area", impliedProps: {} },
  { type: "scatter", label: "Scatter", impliedProps: {} },
  { type: "histogram", label: "Histogram", impliedProps: {} },
  { type: "pie", label: "Pie", impliedProps: {} },
  { type: "table", label: "Table (Vega)", impliedProps: {} },
  { type: "DataTable" as ChartVariant["type"], label: "Table", impliedProps: {} },
  { type: "BigValue" as ChartVariant["type"], label: "KPI", impliedProps: {} },
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
                ? "bg-primary/20 text-primary ring-1 ring-primary"
                : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {variant.label}
          </button>
        );
      })}
    </div>
  );
}
