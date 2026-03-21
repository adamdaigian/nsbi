# Vega-Lite Migration Design

## Context

nsbi is being redesigned as the visualization foundation for both the standalone open-source BI-as-code tool and Northstar's front-end. The current charting layer uses ECharts (tree-shaken to ~300KB) with 5 chart components (LineChart, AreaChart, BarChart, ScatterPlot, Sparkline), 2 non-ECharts components (BigValue, DataTable), and an EChartsRaw escape hatch.

The entire front-end is being rebuilt. MDX is not required. The authoring model is moving to declarative config files (YAML/JSON) that compile to dashboards.

## Decision

Replace ECharts with Vega-Lite as the sole charting layer, using **Approach B: Vega-Lite native** — no sugar layer, no intermediate abstraction. Vega-Lite specs are the universal format consumed by all three interfaces.

### Why Vega-Lite over ECharts

- **Grammar of graphics** — compositional and extensible. Any chart type is expressible without registering new modules. No more silent failures from unregistered ECharts chart types.
- **Declarative JSON specs** — perfect fit for YAML config files, chart builder state, and LLM generation.
- **LLM-friendly** — well-documented, massive training corpus. LLMs generate Vega-Lite specs reliably.
- **Smaller bundle** — vega-lite + vega-embed is ~200KB vs ~300KB for tree-shaken ECharts.
- **SVG by default** — better for export, print, and accessibility. Canvas available for large datasets.
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
  vega-embed renders to SVG (default) or Canvas (large datasets)
        |
  Mounted in React container with title/subtitle chrome
```

**One React component: `<VegaChart>`** — takes a Vega-Lite spec, data, and theme config. This is the only rendering primitive. Everything else (builder, AI, config parser) produces specs that feed into it.

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

- `echarts`, `echarts-for-react` dependencies
- `src/components/charts/echarts-core.ts` (tree-shaking config)
- `src/components/charts/LineChart.tsx`
- `src/components/charts/AreaChart.tsx`
- `src/components/charts/BarChart.tsx`
- `src/components/charts/ScatterPlot.tsx`
- `src/components/charts/EChartsRaw.tsx`
- `src/components/charts/Sparkline.tsx` (reimplemented with Vega-Lite)
- `useEChartsTheme` hook

## What Gets Added

- `vega`, `vega-lite`, `vega-embed` dependencies
- `src/components/charts/VegaChart.tsx` — single rendering component
- `src/components/charts/vega-theme.ts` — Northstar theme as Vega config
- Convenience presets (smart defaults for common chart types — not a compiler, just a utility that fills in reasonable `type` annotations and formatting defaults)

## Open Questions

- **Interactivity model** — Vega-Lite supports selections, tooltips, and cross-filtering natively. How much of this should be exposed in the config format vs handled by the builder?
- **Sparkline implementation** — render via Vega-Lite (consistent pipeline) or keep as pure SVG (lighter weight for inline use)?
- **Large dataset threshold** — at what row count should rendering switch from SVG to Canvas?
- **Config file format** — YAML vs TOML vs JSON for dashboard definitions?
- **Chart builder scope** — full Vega-Lite editor (like vega-editor) or constrained to common chart types with a "raw spec" escape hatch?
