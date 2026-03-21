export type ChartType =
  | "LineChart"
  | "AreaChart"
  | "BarChart"
  | "ScatterPlot"
  | "DataTable"
  | "BigValue"
  | "Sparkline"
  | "EChartsRaw";

export interface ChartSpec {
  id: string;
  type: ChartType;
  queryRef: string;
  props: Record<string, unknown>;
  title?: string;
}

export interface QuerySpec {
  name: string;
  type: "sql" | "semantic";
  sql?: string;
  semantic?: {
    topic: string;
    dimensions: string[];
    measures: string[];
    timeGrain?: string;
    filters?: Array<{ field: string; operator: string; value: unknown }>;
    orderBy?: Array<{ field: string; direction: "asc" | "desc" }>;
    limit?: number;
  };
}

export type LayoutSpec =
  | { type: "grid"; props: { cols?: number; gap?: number }; children: Array<LayoutSpec | ChartSpec> }
  | { type: "group"; props: { title?: string }; children: Array<LayoutSpec | ChartSpec> }
  | { type: "tabs"; props: {}; children: Array<{ label: string; value: string; content: Array<LayoutSpec | ChartSpec> }> }
  | ChartSpec;

export interface PageSpec {
  title: string;
  description?: string;
  queries: QuerySpec[];
  layout: Array<LayoutSpec | ChartSpec>;
}

export function isChartSpec(item: LayoutSpec | ChartSpec): item is ChartSpec {
  return "type" in item && "queryRef" in item;
}
