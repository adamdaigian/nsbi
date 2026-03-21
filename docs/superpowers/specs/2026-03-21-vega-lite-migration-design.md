# Vega-Lite Migration Design

## Context

nsbi is being redesigned as the visualization foundation for both the standalone open-source BI-as-code tool and Northstar's front-end. The current charting layer uses ECharts (tree-shaken to ~300KB) with 5 chart components (LineChart, AreaChart, BarChart, ScatterPlot, Sparkline), 3 non-ECharts components (BigValue, Delta, DataTable), and an EChartsRaw escape hatch.

The entire front-end is being rebuilt. MDX is not required. The authoring model is moving to declarative config files (YAML/JSON) that compile to dashboards.

## Decision

Replace ECharts with Vega-Lite as the sole charting layer, using **Approach B: Vega-Lite native** — no sugar layer, no intermediate abstraction. Vega-Lite specs are the universal format consumed by all three interfaces.

### Why Vega-Lite over ECharts

- **Grammar of graphics** — compositional and extensible. Any chart type is expressible without registering new modules. No more silent failures from unregistered ECharts chart types.
- **Declarative JSON specs** — perfect fit for YAML config files, chart builder state, and LLM generation.
- **LLM-friendly** — well-documented, massive training corpus. LLMs generate Vega-Lite specs reliably.
- **Smaller bundle** — vega-lite + vega-embed is ~200KB vs ~300KB for tree-shaken ECharts.
- **SVG rendering** — better for export, print, and accessibility.
- **Native theming** — Vega config objects map directly to Northstar's design tokens.
- **Ecosystem** — thousands of examples, excellent docs, active development.

### Why not LLM-generated HTML/CSS/SVG

Considered and rejected. Fatal flaws for a BI tool:
- **Non-deterministic** — same data renders differently each time.
- **Latency** — LLM generation takes seconds per chart vs instant spec rendering.
- **Cost** — every chart render is an API call.
- **No interactivity** without additional LLM calls.
- **XSS surface** from generated HTML/SVG.
- **Breaks static site generation** — can't pre-render without an LLM.
- **Inaccessible offline.**

### Why not a custom abstract chart model (Approach C)

- Risk of reinventing Vega-Lite poorly.
- Ongoing maintenance of a spec format, compiler, and documentation.
- Vega-Lite already IS the well-designed abstraction for this problem.

### Why not a sugar layer on top of Vega-Lite (Approach A)

- Two dialects (sugar vs raw) confuse users.
- Translation layer is another source of bugs.
- The three primary consumers (config files, chart builder, AI) are all capable of working with Vega-Lite directly.
- Convenience presets (smart defaults for common charts) achieve the same conciseness without a compiler.

## Three Consumers

The charting layer serves three interfaces:

1. **Declarative config files** — YAML dashboards embed Vega-Lite specs for each chart. Hand-authored or AI-assisted.
2. **Visual chart builder** — GUI that reads/writes Vega-Lite specs. The spec is the source of truth.
3. **AI generation** — LLMs produce Vega-Lite specs from natural language. No intermediate format needed.

## Architecture

### Core Rendering Layer

Single renderer: `vega-embed` wrapping Vega-Lite specs.

```
Vega-Lite JSON spec + data rows
        |
  Northstar theme applied (colors, fonts, background)
        |
  vega-embed renders to SVG (always — 10K row cap, error if exceeded)
        |
  Mounted in React container with title/subtitle chrome
```

**One React component: `<VegaChart>`** — the only rendering primitive. Everything else (builder, AI, config parser) produces specs that feed into it.

Props interface:

| Prop | Type | Description |
|---|---|---|
| `spec` | Partial Vega-Lite spec (`mark` + `encoding`) | The chart definition — not a full `TopLevelSpec`. The component assembles the full spec internally. |
| `data` | `Record<string, unknown[]>` | Named datasets injected into the spec. |
| `title` | `string` (optional) | Rendered as React chrome above the chart, not inside the Vega-Lite spec. |
| `subtitle` | `string` (optional) | Rendered as React chrome below the title. |
| `width` / `height` | `number \| "container"` (optional) | Defaults to `"container"` (responsive to parent). |
| `className` | `string` (optional) | For layout styling on the wrapper div. |

The component is responsible for:
- Assembling the full `TopLevelSpec` from the partial spec + data + theme config
- Validating the 10K row cap (throws before rendering)
- Calling `vega-embed` and cleaning up via `result.finalize()` on unmount
- Catching `vega-embed` errors and rendering an inline error message

### Theme System

Vega-Lite supports native theming via custom config objects. The Northstar dark theme maps to a Vega config:

| Northstar token | Vega config path |
|---|---|
| Neural Black `#0A0B0B` | `background` |
| Optic White `#FFFFFF` | `title.color`, `axis.labelColor`, `legend.labelColor` |
| Cyber Silber `#949494` | `axis.gridColor`, `axis.tickColor` |
| Borders `rgba(148,148,148,0.12)` | `axis.domainColor` |
| 5-color palette | `range.category` |

Applied globally — no per-chart color wiring needed.

### Data Binding

Vega-Lite specs reference named datasets. The query engine (DuckDB native or WASM) produces rows, injected as:

```json
{
  "data": { "name": "revenue" },
  "datasets": { "revenue": [ ...rows ] }
}
```

This replaces the current `QueryProvider` / `withQueryData` HOC pattern.

### Spec Assembly

All consumers pass partial specs (just `mark` + `encoding`) to `<VegaChart>`. The component handles assembly internally — adding `$schema`, `data`, theme config, and sizing defaults to produce a full `TopLevelSpec` before calling `vega-embed`. This means the config parser, chart builder, and AI generation all use the same simple interface without needing to construct complete Vega-Lite specs themselves.

The YAML config format separates `data`, `title`, and `spec` into sibling keys for readability. The config parser extracts these and passes them as separate props to `<VegaChart>` — no intermediate assembly step needed.

### Dashboard Config Format

```yaml
queries:
  revenue:
    sql: SELECT month, mrr, category FROM metrics
  churn:
    sql: SELECT month, churn_rate FROM metrics

layout:
  - row:
    - chart: mrr_trend
    - chart: churn_rate

charts:
  mrr_trend:
    data: revenue
    title: Monthly Recurring Revenue
    spec:
      mark: bar
      encoding:
        x: { field: month, type: temporal }
        y: { field: mrr, type: quantitative }
        color: { field: category, type: nominal }

  churn_rate:
    data: churn
    title: Churn Rate
    spec:
      mark: line
      encoding:
        x: { field: month, type: temporal }
        y: { field: churn_rate, type: quantitative, axis: { format: ".1%" } }
```

### Non-ECharts Components

- **BigValue** — pure React, no charting library. Retained as-is (redesigned for new front-end).
- **DataTable** — TanStack Table, no charting library. Retained as-is.
- **Sparkline** — reimplemented as a minimal Vega-Lite spec (inline line chart, no axes/legend).
- **Delta** — pure React. Retained as-is.

## What Gets Removed

ECharts chart components and dependencies:
- `echarts`, `echarts-for-react` dependencies
- `src/components/charts/echarts-core.ts` (tree-shaking config)
- `src/components/charts/LineChart.tsx`
- `src/components/charts/AreaChart.tsx`
- `src/components/charts/BarChart.tsx`
- `src/components/charts/ScatterPlot.tsx`
- `src/components/charts/EChartsRaw.tsx`
- `src/components/charts/Sparkline.tsx` (reimplemented with Vega-Lite)
- `useEChartsTheme` hook

Infrastructure replaced by the new architecture:
- `src/components/charts/ChartContainer.tsx` — absorbed into `<VegaChart>` (title/subtitle chrome + error boundary)
- `src/components/charts/ChartError.tsx` — replaced by inline error rendering in `<VegaChart>`
- `src/components/charts/ChartErrorBoundary.tsx` — replaced by `vega-embed` error catching in `<VegaChart>`
- `src/components/QueryContext.tsx` — replaced by YAML config `queries` section + direct data passing
- `src/components/withQueryData.tsx` — replaced by the config parser's data binding (no HOC needed)
- `src/components/registry.ts` — obsolete; the MDX component registry is replaced by the YAML config parser

Builder layers replaced:
- `src/builder/codegen.ts` — builder now reads/writes Vega-Lite specs directly instead of generating MDX
- `src/builder/parse-mdx.ts` — no MDX to parse; builder state is a mutable Vega-Lite spec object
- `src/builder/sync.ts` — bidirectional sync is replaced by the spec being the single source of truth
- `src/builder/types.ts` — rewritten; ECharts-era types (`ChartType`, `ChartSpec`, etc.) replaced with Vega-Lite equivalents. `ChartType` union maps to the 12 builder chart types + `"table"`. `ChartSpec` wraps a partial Vega-Lite spec + metadata (title, data source, preset).

## What Gets Added

- `vega`, `vega-lite` (v5.x, `$schema: https://vega.github.io/schema/vega-lite/v5.json`), `vega-embed` dependencies
- `src/components/charts/VegaChart.tsx` — single rendering component
- `src/components/charts/vega-theme.ts` — Northstar theme as Vega config
- `src/config/presets.ts` — convenience presets: functions that take a chart type string (e.g., `"stacked-bar"`) and return a partial Vega-Lite spec with reasonable defaults (stack mode, type annotations, format strings). Applied at config parse time. Not a compiler — just a shorthand so users can write `preset: stacked-bar` instead of manually setting `mark.type`, `encoding.y.stack`, etc. Signature: `applyPreset(preset: string, userSpec: Partial<VegaLiteSpec>) => Partial<VegaLiteSpec>`

### Error Handling

- **Row cap exceeded** — `<VegaChart>` checks `data` array lengths before calling `vega-embed`. If any dataset exceeds 10K rows, renders an inline error message with the count and the cap. No throw — graceful degradation so other charts on the dashboard still render.
- **Malformed Vega-Lite spec** — `vega-embed` errors are caught and rendered as an inline error message inside the chart container, showing the Vega error text. Common in raw spec escape hatch usage.
- **Missing data** — if a chart references a named dataset that wasn't provided, renders an inline error rather than a blank chart.
- **No global error boundary** — errors are chart-local. A broken chart does not take down the dashboard.

## Resolved Decisions

### Interactivity Model

**Moderate exposure.** Tooltips enabled by default. Single-chart selections (brush, click) configurable in YAML. Cross-chart filtering is builder-only — too complex to express declaratively, and the builder is the right place for wiring charts together.

### Sparkline Implementation

**Vega-Lite.** Rendered via the same `<VegaChart>` component as all other charts (minimal spec: inline line, no axes/legend). Vega-Lite is already loaded for other charts so the marginal cost is zero, and one rendering pipeline means the theme system works everywhere.

### Data Row Limit

**10,000 row hard cap.** SVG-only rendering — no Canvas path. If a query returns more than 10K rows, throw a clear error. BI dashboards work with aggregated data; 10K rows is more than sufficient. Keeps the rendering layer simple.

### Config File Format

**YAML.** Already used for the semantic layer. Readable, supports comments, handles nested Vega-Lite specs well. Consistent with the rest of the project.

### Chart Builder Scope

**Constrained to 12 Vega-Lite chart types + Table** with a raw Vega-Lite spec escape hatch for anything beyond:

| Category | Types |
|---|---|
| Column | Grouped, Stacked, 100% Stacked |
| Bar | Grouped, Stacked, 100% Stacked |
| Line & Area | Line, Stacked area, 100% Stacked area |
| Other | Histogram, Scatter, Pie |
| Table | Table (TanStack Table — not Vega-Lite) |

12 Vega-Lite chart types + 1 TanStack Table type. The builder provides a guided UI for these; power users can drop to raw Vega-Lite specs for anything else.
