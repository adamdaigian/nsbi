# Markdown Dashboard Pages — Design Spec

## Overview

Convert all demo pages from YAML to `.md` files and activate the MDX rendering pipeline. Authors write plain markdown with embedded SQL queries and chart components. The system compiles it transparently using MDX under the hood.

**Goals:**
- All demo pages are `.md` files — no YAML dashboard configs
- Showcase that you can mix narrative prose with charts in a single file
- Ship 3 demo pages at different levels of detail: L0 executive overview, L1 channel analysis, L2 narrative deep-dive

**Non-goals:**
- Backward compatibility with YAML format (remove YAML rendering path)
- Custom MDX plugins or remark/rehype extensions

## Page Format

Every page is a `.md` file in `demo/pages/`. The format has three elements:

### 1. YAML Frontmatter

```markdown
---
title: Executive Metrics L0
description: Key SaaS metrics for board reporting
---
```

### 2. SQL Query Blocks

Fenced code blocks with `sql` language tag. A `-- name: query_name` comment on the first line names the query so components can reference it.

````markdown
```sql
-- name: arr_growth
SELECT
  DATE_TRUNC('month', event_date) AS month,
  SUM(SUM(mrr_delta)) OVER (ORDER BY DATE_TRUNC('month', event_date)) * 12 AS arr
FROM subscription_events
GROUP BY 1
ORDER BY month
```
````

SQL blocks are extracted before rendering — they don't appear in the output. All queries execute in parallel when the page loads.

### 3. Markdown + Chart Components

Regular markdown for prose. JSX components for charts and KPIs inline.

```markdown
## Revenue is compounding

MRR has grown 5x since Series A, driven by the segment mix shifting upmarket
and expansion revenue kicking in.

<LineChart data="arr_growth" x="month" y="arr" title="ARR Growth" yFormat="$~s" />
```

## Chart Components

Simple wrapper components that take intuitive props and generate Vega-Lite specs internally. These replace the verbose `VegaChart` spec syntax.

### `<LineChart>`

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| data | string | yes | Query name |
| x | string | yes | X-axis field |
| y | string | yes | Y-axis field |
| color | string | no | Multi-series field |
| title | string | no | Chart title |
| yFormat | string | no | d3-format for y-axis (e.g., `$~s`, `.0%`) |
| xTimeUnit | string | no | Vega-Lite timeUnit (e.g., `yearmonth`) |

### `<BarChart>`

Same props as LineChart, plus:

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| stack | boolean | no | Stacked bars (default false) |

### `<AreaChart>`

Same props as LineChart. Always stacked when `color` is provided.

### `<KPI>`

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| data | string | yes | Query name |
| value | string | yes | Field name for main value |
| title | string | no | Label |
| format | string | no | Format for main value (`num0`, `usd_compact`, `pct0`) |
| comparison | string | no | Field name for delta value |
| comparisonFormat | string | no | Format for delta |
| comparisonLabel | string | no | e.g., "vs last month" |
| isUpGood | boolean | no | Color interpretation (default true) |

### `<DataTable>`

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| data | string | yes | Query name |
| title | string | no | Table title |

### Layout: `<Grid>`

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| cols | number | no | Column count (default 2) |

Arranges children in a CSS grid. Used for KPI rows and side-by-side charts.

## Rendering Pipeline

1. **API serves `.md` file** — `/api/page?path=index` returns `{ content, format: "md" }`
2. **DashboardPage** detects `format === "md"`
3. **Parser** extracts YAML frontmatter and SQL blocks from the markdown content
4. **Query engine** executes all extracted SQL queries in parallel
5. **MDX compiler** compiles the cleaned markdown (with JSX components) into a React component
6. **QueryContext** wraps the compiled component, providing query results to chart components
7. Components render, resolving `data="query_name"` to actual row arrays via context

### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/mdx/QueryContext.tsx` | React context for query results |
| Create | `src/components/mdx/LineChart.tsx` | LineChart wrapper |
| Create | `src/components/mdx/BarChart.tsx` | BarChart wrapper |
| Create | `src/components/mdx/AreaChart.tsx` | AreaChart wrapper |
| Create | `src/components/mdx/KPI.tsx` | KPI wrapper (wraps BigValue) |
| Create | `src/components/mdx/MDXDataTable.tsx` | DataTable wrapper |
| Create | `src/components/mdx/Grid.tsx` | Grid layout component |
| Create | `src/components/mdx/index.ts` | Barrel export |
| Modify | `src/app/DashboardPage.tsx` | Add MD/MDX rendering path |
| Modify | `src/dev/api-middleware.ts` | Serve `.md` files, update page scanner |
| Delete | `demo/pages/index.yaml` | Replaced by index.md |
| Delete | `demo/pages/growth.yaml` | Replaced by channel-analysis.md |
| Create | `demo/pages/index.md` | Executive Metrics L0 |
| Create | `demo/pages/channel-analysis.md` | Channel Analysis L1 |
| Create | `demo/pages/key-drivers.md` | Key Drivers L2 |

## Demo Pages

### Page 1: Executive Metrics L0 (`index.md`)

The existing executive dashboard converted from YAML to markdown format. Same KPI cards, same 10 charts, same top accounts table — but authored as a `.md` file. Minimal prose — this is a dense metric dashboard.

Structure:
- Frontmatter: title, description
- SQL query blocks (same queries as current index.yaml)
- KPI row using `<Grid cols={3}>` + `<KPI>` components
- Revenue KPI row using `<Grid cols={4}>` + `<KPI>` components
- Chart rows using `<Grid cols={2}>` + chart components
- `<DataTable>` for top accounts

### Page 2: Channel Analysis L1 (`channel-analysis.md`)

Reframe of the current growth analytics page as channel-focused analysis. Same data model, adjusted queries and framing.

Structure:
- Frontmatter: title, description
- Brief intro paragraph (1-2 sentences)
- KPI row: Total Accounts, Trial Conversion Rate, Avg Days to Convert, Expansion Rate
- Section: **Acquisition Channels** — signups by source (stacked bar), revenue by source (stacked bar)
- Section: **Segment Mix** — signups by segment (stacked bar), accounts by plan (area)
- Section: **Trial Funnel** — trial funnel (grouped bar), account status (pie)
- Recent signups table

### Page 3: Key Drivers L2 (`key-drivers.md`)

The narrative showcase page. Written like a board memo — substantive prose analysis with supporting charts. This is the page that demonstrates "look, you can write markdown with embedded charts."

Structure:

```
---
title: Key Drivers L2
description: Deep-dive on the drivers improving business outcomes
---

# What's Working: A Deep-Dive on Growth Drivers

[2-3 sentence executive summary of the growth story]

## 1. The Segment Shift

[2 paragraphs: how enterprise mix is growing, what this means for ASP
and revenue quality. Reference the Series A as the inflection point.]

<Grid cols={2}>
<AreaChart ... MRR by segment over time />
<LineChart ... ASP trend />
</Grid>

[1 paragraph: interpreting the charts, calling out the key takeaway]

## 2. Retention Is Compounding

[2 paragraphs: churn rates tightening across all segments,
enterprise retention particularly strong. Explain the compounding
effect — lower churn means the base grows faster.]

<Grid cols={2}>
<LineChart ... churn rate by segment />
<LineChart ... retention cohort curves />
</Grid>

[1 paragraph: what this means for net revenue retention]

## 3. The Expansion Engine

[2 paragraphs: expansion revenue growing as % of total,
driven by seat-based growth in mid-market and enterprise.
This is the "land and expand" motion working.]

<Grid cols={2}>
<BarChart ... net new MRR components (stacked) />
<LineChart ... expansion % of total />
</Grid>

[1 paragraph: tying it together — these three drivers compound]

## What This Means

[Closing paragraph: the business is transitioning from
acquisition-driven to expansion-driven growth, which is
the hallmark of a healthy SaaS company.]
```

## Testing

- Run `npm run dev` and verify all 3 pages render
- Verify sidebar shows all 3 pages
- Verify charts render with data in all pages
- Verify the Key Drivers page renders markdown prose correctly (headers, paragraphs, emphasis)
- Verify SQL blocks are hidden from output (only used for data)
- Verify hot reload works when editing `.md` files
