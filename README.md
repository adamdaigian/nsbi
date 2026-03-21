# nsbi

**BI-as-Code.** Write `.mdx` files with SQL queries, run `nsbi dev`, see live dashboards — powered by DuckDB.

nsbi is the open-source visualization framework extracted from [Northstar](https://findnorthstar.ai). Same component APIs, same design system — built for developers who want dashboards defined in code, not drag-and-drop GUIs.

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/nsbi.git
cd nsbi
npm install

# Start the demo dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

### Create a new project

```bash
npx nsbi init my-dashboard
cd my-dashboard
npx nsbi dev
```

## How It Works

Drop CSV or Parquet files in your `data/` directory. Write `.mdx` pages with SQL queries. nsbi auto-registers your data files as DuckDB tables and renders interactive charts.

```mdx
---
title: Sales Overview
---

```sql revenue_by_month
SELECT strftime(date, '%Y-%m') AS month, SUM(amount) AS revenue
FROM sales
GROUP BY month ORDER BY month
```

<Group title="Revenue">
  <Grid cols={2}>
    <BigValue data="revenue_by_month" value="revenue" title="Total Revenue" fmt="usd0" />
    <LineChart data="revenue_by_month" x="month" y="revenue" title="Monthly Revenue" />
  </Grid>
</Group>
```

No imports needed — all components are available automatically in your MDX files.

## Features

### Charts

| Component | Description |
|-----------|-------------|
| `LineChart` | Time series and trends |
| `BarChart` | Comparisons (stacked & grouped) |
| `AreaChart` | Volume over time |
| `ScatterPlot` | Correlations |
| `BigValue` | KPI cards |
| `Sparkline` | Inline mini charts |
| `DataTable` | Sortable tabular data |
| `EChartsRaw` | Full ECharts API access |

### Interactive Filters

Filters bind to SQL via template variables. Change a filter, queries re-execute automatically.

```mdx
<Dropdown name="region" label="Region" options={["US", "EU", "APAC"]} defaultValue="US" />

```sql filtered_sales
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
| `CheckboxFilter` | Checkbox group |

### Layout

```mdx
<Group title="Section Title">
  <Grid cols={3}>
    <BigValue ... />
    <BigValue ... />
    <BigValue ... />
  </Grid>
</Group>

<Tabs>
  <Tab label="Revenue">
    <LineChart ... />
  </Tab>
  <Tab label="Users">
    <BarChart ... />
  </Tab>
</Tabs>
```

### Multi-Page Dashboards

Organize pages in a `pages/` directory. nsbi auto-generates sidebar navigation.

```
my-project/
├── data/
│   ├── sales.csv
│   └── users.parquet
└── pages/
    ├── index.mdx
    ├── revenue.mdx
    └── analysis/
        ├── growth.mdx
        └── retention.mdx
```

### Hot Reload

Edit your `.mdx` files or data files — the dashboard updates instantly via WebSocket.

## CLI

```bash
nsbi dev --project ./my-project        # Start dev server
nsbi dev --project ./my-project --port 3001  # Custom port
nsbi init my-project                   # Scaffold new project
nsbi build --project ./my-project      # Production build
nsbi preview                           # Preview production build
```

## Architecture

```
Browser (Vite SPA)                    Node.js Dev Server
┌─────────────────────┐              ┌──────────────────────┐
│ 1. Fetch .mdx       │  GET /api/   │                      │
│ 2. Parse frontmatter │  page        │  Express + Vite      │
│    + SQL blocks      │ ─────────>   │  middleware mode      │
│ 3. POST /api/query   │              │                      │
│    for each SQL      │  <─────────  │  DuckDB (native)     │
│ 4. Compile MDX       │  JSON rows   │  auto-registers CSV/ │
│ 5. Render charts     │              │  parquet as tables   │
└─────────────────────┘              └──────────────────────┘
```

- **MDX compilation** happens client-side via `@mdx-js/mdx`
- **SQL execution** happens server-side via native DuckDB bindings
- **Component injection** — all chart/layout/input components are available in MDX without imports
- **Data binding** — `QueryProvider` context + `withQueryData` HOC resolves `data="query_name"` props

## Northstar

This dashboarding tool is extracted from [Northstar](https://findnorthstar.ai), sharing its component library and rendering engine for open source use cases. The same charts, layouts, and inputs here are the ones powering Northstar visualizations.

The roadmap includes deeper Northstar integration: a semantic metrics layer, AI-assisted chart generation, and a visual chart builder with bidirectional MDX sync.


## Tech Stack

- [DuckDB](https://duckdb.org/) — analytical SQL engine
- [MDX](https://mdxjs.com/) — Markdown + JSX
- [ECharts](https://echarts.apache.org/) — charting library
- [Vite](https://vitejs.dev/) — build tool
- [React](https://react.dev/) — UI framework
- [Tailwind CSS v4](https://tailwindcss.com/) — styling

## License

MIT
