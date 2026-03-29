# nsbi

**BI-as-Code.** Write `.md` files with SQL queries, run `nsbi dev`, see live dashboards — powered by DuckDB.

nsbi is an open-source dashboard framework built for developers who want dashboards defined in code, not drag-and-drop GUIs. Drop in your data files, write SQL, and compose charts with simple components.

## Quick Start

```bash
# Create a new project from a template
npx nsbi init my-dashboard --template saas-metrics
cd my-dashboard

# Start the dev server
npx nsbi dev --project .
```

Open [http://localhost:3000](http://localhost:3000) to see your dashboard.

## How It Works

Drop CSV or Parquet files in your `data/` directory. Write `.md` pages with SQL queries. nsbi auto-registers your data files as DuckDB tables and renders interactive charts.

```md
---
title: Sales Overview
---

```sql
-- name: revenue_by_month
SELECT strftime(date, '%Y-%m') AS month, SUM(amount) AS revenue
FROM sales
GROUP BY month ORDER BY month
```

<Grid cols={2}>
  <KPI data="revenue_by_month" value="revenue" title="Total Revenue" format="usd_compact" />
  <LineChart data="revenue_by_month" x="month" y="revenue" title="Monthly Revenue" />
</Grid>
```

No imports needed — all components are available automatically in your pages.

## Charts

| Component | Description |
|-----------|-------------|
| `LineChart` | Time series and trends |
| `BarChart` | Comparisons (stacked & grouped) |
| `AreaChart` | Volume over time (stacked) |
| `KPI` | Single-value metric cards with comparison deltas |
| `DataTable` | Searchable, sortable tabular data |

### Chart Props

All chart components share a common prop interface:

```md
<LineChart
  data="query_name"
  x="month"
  y="revenue"
  color="category"
  title="Revenue by Category"
  yFormat="$~s"
  xTimeUnit="yearmonth"
/>
```

| Prop | Description |
|------|-------------|
| `data` | Name of the SQL query to bind to |
| `x` / `y` | Column names for axes |
| `color` | Column for color-encoding (series/groups) |
| `title` | Chart title |
| `yFormat` | Vega-Lite format string (`"$~s"`, `".0%"`, etc.) |
| `xTimeUnit` | Vega-Lite time unit (`"yearmonth"`, `"yearweek"`, etc.) |

BarChart adds `stack` (boolean) for stacked bars.

## Interactive Filters

Filters bind to SQL via template variables. Change a filter, queries re-execute automatically.

```md
<Dropdown name="region" label="Region" options={["US", "EU", "APAC"]} defaultValue="US" />

```sql
-- name: filtered_sales
SELECT * FROM sales WHERE region = '${region}'
```

<BarChart data="filtered_sales" x="product" y="amount" title="Sales by Product" />
```

| Component | Description |
|-----------|-------------|
| `Dropdown` | Single select |
| `MultiSelect` | Multi-choice select |
| `ButtonGroup` | Toggle button group |
| `TextInput` | Free text input |
| `Slider` | Numeric range |
| `DateInput` | Single date picker |
| `DateRange` | Date range picker |
| `CheckboxFilter` | Checkbox toggle |

## Layout

```md
<Group title="Revenue Metrics">
  <Grid cols={3}>
    <KPI data="kpis" value="mrr" title="MRR" format="usd_compact" />
    <KPI data="kpis" value="arr" title="ARR" format="usd_compact" />
    <KPI data="kpis" value="net_revenue" title="Net Revenue" format="usd_compact" />
  </Grid>
</Group>

<Tabs defaultValue="revenue">
  <TabsList>
    <TabsTrigger value="revenue">Revenue</TabsTrigger>
    <TabsTrigger value="users">Users</TabsTrigger>
  </TabsList>
  <TabsContent value="revenue">
    <LineChart data="monthly_revenue" x="month" y="revenue" />
  </TabsContent>
  <TabsContent value="users">
    <BarChart data="users_by_plan" x="plan" y="count" />
  </TabsContent>
</Tabs>
```

## Multi-Page Dashboards

Organize pages in a `pages/` directory. nsbi auto-generates sidebar navigation.

```
my-project/
├── data/
│   ├── sales.csv
│   └── users.parquet
├��─ pages/
│   ├── index.md
│   ├── revenue.md
│   └── analysis/
│       ├── growth.md
│       └─��� retention.md
└── nsbi.config.ts
```

## CLI

```bash
nsbi dev --project ./my-project        # Start dev server
nsbi dev --project ./my-project --port 3001  # Custom port
nsbi init my-project                   # Scaffold new project
nsbi init my-project --template saas-metrics  # Use a template
nsbi build --project ./my-project      # Production build (static site)
nsbi preview                           # Preview production build
```

### Templates

| Template | Description |
|----------|-------------|
| `blank` | Empty starter with a single page |
| `saas-metrics` | ARR, churn, retention, cohort analysis |
| `sales-pipeline` | Pipeline, forecasting, rep performance |
| `product-analytics` | Engagement, activation, feature usage |

## Architecture

```
Browser (Vite SPA)                    Node.js Dev Server
┌──��──────────────────┐              ┌──────────────────────┐
│ 1. Fetch page       │  GET /api/   │                      │
│ 2. Parse frontmatter │  page        │  Express + Vite      │
│    + SQL blocks      │ ─────────>   │  middleware mode      │
│ 3. POST /api/query   │              │                      │
│    for each SQL      │  <─────────  │  DuckDB (native)     │
�� 4. Compile MDX       │  JSON rows   │  auto-registers CSV/ │
│ 5. Render charts     │              │  parquet as tables   │
└─���───────────────────┘              └───────────────���──────┘
```

In production, `nsbi build` generates a static site with DuckDB WASM running queries in the browser — no server needed.

## Tech Stack

- [DuckDB](https://duckdb.org/) — analytical SQL engine (native in dev, WASM in production)
- [Vega-Lite](https://vega.github.io/vega-lite/) — declarative chart grammar
- [MDX](https://mdxjs.com/) — Markdown + JSX
- [Vite](https://vitejs.dev/) — build tool
- [React](https://react.dev/) — UI framework
- [Tailwind CSS v4](https://tailwindcss.com/) — styling

## Documentation

Full documentation is available in the [`docs-site/`](./docs-site) directory. To run it locally:

```bash
cd docs-site
npm install
npm run dev
```

## License

MIT
