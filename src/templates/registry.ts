import type { SchemaMetadata } from "@/types/schema";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  generateMDX: (context: TemplateContext) => string;
}

export interface TemplateContext {
  schema?: SchemaMetadata;
  selectedTable?: string;
}

// ─── Helper: detect column types ─────────────────────────────────────────────

function findNumericColumns(schema: SchemaMetadata, table: string): string[] {
  const t = schema.tables.find((t) => t.name === table);
  if (!t) return [];
  return t.columns
    .filter((c) => {
      const upper = c.type.toUpperCase();
      return ["INTEGER", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL", "SMALLINT", "TINYINT", "HUGEINT", "NUMERIC"].some(
        (numType) => upper.startsWith(numType),
      );
    })
    .map((c) => c.name);
}

function findDateColumns(schema: SchemaMetadata, table: string): string[] {
  const t = schema.tables.find((t) => t.name === table);
  if (!t) return [];
  return t.columns
    .filter((c) => {
      const upper = c.type.toUpperCase();
      return upper.startsWith("DATE") || upper.startsWith("TIMESTAMP");
    })
    .map((c) => c.name);
}

function findStringColumns(schema: SchemaMetadata, table: string): string[] {
  const t = schema.tables.find((t) => t.name === table);
  if (!t) return [];
  return t.columns
    .filter((c) => {
      const upper = c.type.toUpperCase();
      return upper === "VARCHAR" || upper === "TEXT" || upper.startsWith("STRING");
    })
    .map((c) => c.name);
}

// ─── Templates ───────────────────────────────────────────────────────────────

const kpiOverview: DashboardTemplate = {
  id: "kpi-overview",
  name: "KPI Overview",
  description: "KPI cards at the top with supporting charts below",
  category: "General",
  generateMDX: ({ schema, selectedTable }) => {
    const table = selectedTable ?? schema?.tables[0]?.name ?? "my_table";
    const numCols = schema ? findNumericColumns(schema, table) : ["value"];
    const dateCols = schema ? findDateColumns(schema, table) : [];
    const strCols = schema ? findStringColumns(schema, table) : [];

    const kpiCol = numCols[0] ?? "value";
    const secondCol = numCols[1] ?? kpiCol;
    const dateCol = dateCols[0];
    const catCol = strCols[0];

    let queries = `\`\`\`sql
-- name: kpi_totals
SELECT
  SUM(${kpiCol}) as total_${kpiCol},
  AVG(${kpiCol}) as avg_${kpiCol},
  COUNT(*) as total_records
FROM ${table}
\`\`\``;

    if (dateCol) {
      queries += `

\`\`\`sql
-- name: trend
SELECT
  ${dateCol},
  SUM(${kpiCol}) as ${kpiCol}
FROM ${table}
GROUP BY ${dateCol}
ORDER BY ${dateCol}
\`\`\``;
    }

    if (catCol) {
      queries += `

\`\`\`sql
-- name: by_category
SELECT
  ${catCol},
  SUM(${kpiCol}) as ${kpiCol}
FROM ${table}
GROUP BY ${catCol}
ORDER BY ${kpiCol} DESC
LIMIT 10
\`\`\``;
    }

    let charts = `<Grid cols={3}>
  <BigValue data="kpi_totals" value="total_${kpiCol}" />
  <BigValue data="kpi_totals" value="avg_${kpiCol}" />
  <BigValue data="kpi_totals" value="total_records" />
</Grid>`;

    if (dateCol) {
      charts += `

<LineChart data="trend" x="${dateCol}" y="${kpiCol}" />`;
    }

    if (catCol) {
      charts += `

<BarChart data="by_category" x="${catCol}" y="${kpiCol}" />`;
    }

    return `---
title: ${table} Overview
description: Key metrics and trends
---

${queries}

${charts}
`;
  },
};

const timeSeries: DashboardTemplate = {
  id: "time-series",
  name: "Time Series",
  description: "Line charts tracking metrics over time",
  category: "Analytics",
  generateMDX: ({ schema, selectedTable }) => {
    const table = selectedTable ?? schema?.tables[0]?.name ?? "my_table";
    const numCols = schema ? findNumericColumns(schema, table) : ["value"];
    const dateCols = schema ? findDateColumns(schema, table) : ["date"];
    const strCols = schema ? findStringColumns(schema, table) : [];

    const dateCol = dateCols[0] ?? "date";
    const metricCol = numCols[0] ?? "value";
    const seriesCol = strCols[0];

    let queries = `\`\`\`sql
-- name: daily_metrics
SELECT
  ${dateCol},
  SUM(${metricCol}) as ${metricCol}
FROM ${table}
GROUP BY ${dateCol}
ORDER BY ${dateCol}
\`\`\`

\`\`\`sql
-- name: weekly_metrics
SELECT
  DATE_TRUNC('week', ${dateCol}) as week,
  SUM(${metricCol}) as ${metricCol}
FROM ${table}
GROUP BY week
ORDER BY week
\`\`\``;

    if (seriesCol) {
      queries += `

\`\`\`sql
-- name: by_series
SELECT
  ${dateCol},
  ${seriesCol},
  SUM(${metricCol}) as ${metricCol}
FROM ${table}
GROUP BY ${dateCol}, ${seriesCol}
ORDER BY ${dateCol}
\`\`\``;
    }

    let charts = `<Group title="Daily Trend">
  <LineChart data="daily_metrics" x="${dateCol}" y="${metricCol}" />
</Group>

<Group title="Weekly Trend">
  <AreaChart data="weekly_metrics" x="week" y="${metricCol}" />
</Group>`;

    if (seriesCol) {
      charts += `

<Group title="By ${seriesCol}">
  <LineChart data="by_series" x="${dateCol}" y="${metricCol}" series="${seriesCol}" />
</Group>`;
    }

    return `---
title: ${table} Time Series
description: Metrics tracked over time
---

${queries}

${charts}
`;
  },
};

const breakdown: DashboardTemplate = {
  id: "breakdown",
  name: "Category Breakdown",
  description: "Bar charts comparing categories",
  category: "Analysis",
  generateMDX: ({ schema, selectedTable }) => {
    const table = selectedTable ?? schema?.tables[0]?.name ?? "my_table";
    const numCols = schema ? findNumericColumns(schema, table) : ["value"];
    const strCols = schema ? findStringColumns(schema, table) : ["category"];

    const catCol = strCols[0] ?? "category";
    const metricCol = numCols[0] ?? "value";
    const secondMetric = numCols[1];

    let queries = `\`\`\`sql
-- name: breakdown
SELECT
  ${catCol},
  SUM(${metricCol}) as total_${metricCol},
  COUNT(*) as count
FROM ${table}
GROUP BY ${catCol}
ORDER BY total_${metricCol} DESC
\`\`\``;

    return `---
title: ${table} Breakdown
description: Analysis by ${catCol}
---

${queries}

<Grid cols={2}>
  <BarChart data="breakdown" x="${catCol}" y="total_${metricCol}" sort="desc" labels />
  <BarChart data="breakdown" x="${catCol}" y="count" sort="desc" />
</Grid>

<DataTable data="breakdown" />
`;
  },
};

const monitoring: DashboardTemplate = {
  id: "monitoring",
  name: "Monitoring",
  description: "Sparklines and status indicators for quick health checks",
  category: "Operations",
  generateMDX: ({ schema, selectedTable }) => {
    const table = selectedTable ?? schema?.tables[0]?.name ?? "my_table";
    const numCols = schema ? findNumericColumns(schema, table) : ["value"];
    const dateCols = schema ? findDateColumns(schema, table) : ["date"];

    const dateCol = dateCols[0] ?? "date";
    const metrics = numCols.slice(0, 4);
    if (metrics.length === 0) metrics.push("value");

    const queries = metrics
      .map(
        (m, i) => `\`\`\`sql
-- name: metric_${i}
SELECT ${dateCol}, ${m}
FROM ${table}
ORDER BY ${dateCol} DESC
LIMIT 30
\`\`\``,
      )
      .join("\n\n");

    const sparklines = metrics
      .map(
        (m, i) => `  <Group title="${m}">
    <Sparkline data="metric_${i}" y="${m}" />
  </Group>`,
      )
      .join("\n");

    return `---
title: ${table} Monitor
description: Real-time health metrics
---

${queries}

<Grid cols={${Math.min(metrics.length, 4)}}>
${sparklines}
</Grid>
`;
  },
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const dashboardTemplates: DashboardTemplate[] = [
  kpiOverview,
  timeSeries,
  breakdown,
  monitoring,
];

export function getTemplate(id: string): DashboardTemplate | undefined {
  return dashboardTemplates.find((t) => t.id === id);
}
