# Phase 2: Interactive Dashboards — Development Notes

## Summary

Phase 2 added interactive filters, multi-page routing, hot reload, sidebar navigation, and CLI commands to nsbi. The demo was migrated from flat CSV files to a DuckDB database with a realistic SaaS metrics dataset (11,327 rows across 5 tables).

---

## What Was Ported from Northstar

- 6 shadcn/ui primitives: select, popover, calendar, button, input, checkbox
- FilterContext + 8 input components (Dropdown, DateRange, ButtonGroup, TextInput, MultiSelect, Slider, CheckboxFilter, DateInput)
- All required import path updates (`@/lib/viz/format` → `@/lib/format`, `@/components/viz/` → `@/components/`)

## What Was Built New for nsbi

- Filter → query wiring with two-phase execution model
- SQL template variable extraction and interpolation (`parser.ts`)
- chokidar + WebSocket HMR system (`file-watcher.ts`, `useHotReload.ts`)
- Hash-based multi-page routing with recursive page tree scanner
- Sidebar navigation with collapsible directories and mobile overlay
- CLI commands: `init`, `build`, `preview`
- DuckDB `.db` file support
- SaaS demo dataset generator (`scripts/generate-saas-data.ts`)
- `month` format for clean timestamp labels on charts

---

## Key Design Decisions

### Hash routing over path routing
Simpler than history-based routing — no server-side route handling needed, works with static file serving out of the box. Pages are addressed as `#/page-name` and `#/dir/page-name`.

### Two-phase query execution
Solves the chicken-and-egg problem where filters need to render before their default values can be used in queries. On page load:
1. Static queries (no `${var}` templates) execute immediately
2. Filtered queries are marked as `loading: true` and deferred
3. Input components mount and seed their `defaultValue` into FilterContext
4. Once all referenced variables are set, filtered queries execute
5. Subsequent filter changes trigger debounced re-execution

### Separate WebSocket from Vite HMR
Vite handles TypeScript/React component hot module replacement automatically. A custom WebSocket on `/__nsbi_ws` handles content and data changes — `.mdx` edits, CSV/parquet file updates, and page tree changes. Keeps concerns separate and avoids fighting Vite's HMR system.

### DuckDB .db files as primary data source
Better for larger datasets — preserves column types, supports indexes, single file instead of many CSVs. The engine detects `.db` files in the data directory and opens them directly instead of creating an in-memory database. CSV and parquet files still work for quick iteration.

### Client-side MDX compilation
Same approach as Phase 1. Keeps the server simple (just serves raw `.mdx` text and executes queries). Enables future static site generation where queries are pre-baked at build time and no server is needed.

---

## Filter System Architecture

```
MDX page defines:          Input component:           Query execution:
┌──────────────────┐      ┌────────────────────┐     ┌──────────────────┐
│ <Dropdown         │      │ useFilterValue()   │     │ DashboardPage    │
│   name="source"   │ ──>  │ reads/writes to    │ ──> │ watches filters  │
│   defaultValue=   │      │ FilterContext       │     │ interpolates SQL │
│   "organic" />    │      └────────────────────┘     │ re-executes      │
│                   │                                  │ affected queries │
│ WHERE source =    │                                  └──────────────────┘
│   ${source}       │
└──────────────────┘
```

Template interpolation in `parser.ts` handles type-safe SQL escaping:
- Strings → single-quoted with `'` escape (`'value'`)
- Numbers → raw (`42`)
- Booleans → `TRUE`/`FALSE`
- Dates → `'2025-01-15'`
- Null/undefined → `NULL`

---

## Data Layer

DuckDB engine (`src/engine/duckdb.ts`) supports three data sources in priority order:

1. **`.db` files** — opened directly as the database file
2. **`.csv` files** — auto-registered as tables via `read_csv_auto()`
3. **`.parquet` files** — auto-registered as tables via `read_parquet()`

If a `.db` file is found, it becomes the database. Any CSV/parquet files in the same directory are registered as additional tables on top.

The `reRegisterTable()` function supports HMR — when a data file changes on disk, the table is dropped and recreated from the updated file.

---

## Format System

`src/lib/format.ts` provides named format strings for chart axes and BigValue display:

| Format | Output | Example |
|--------|--------|---------|
| `usd0` | Currency, no decimals | $1,234 |
| `usd2` | Currency, 2 decimals | $1,234.56 |
| `pct` | Percentage, 1 decimal | 12.3% |
| `pct0` | Percentage, no decimals | 12% |
| `num0` | Number, no decimals | 1,234 |
| `num2` | Number, 2 decimals | 1,234.56 |
| `month` | Month + year | Jan 2025 |
| `date` | Full date | Jan 1, 2025 |
| `datetime` | Date + time | Jan 1, 2025 3:45 PM |

Used via `xFmt`/`yFmt` props on charts and `fmt` prop on BigValue.

---

## Demo Dataset

`demo/data/saas.db` — generated by `scripts/generate-saas-data.ts`:

| Table | Rows | Key Columns |
|-------|------|-------------|
| `users` | 1,500 | id, plan, source, industry, status, signup_date |
| `subscriptions` | 1,731 | user_id, plan, status, started_at, cancelled_at |
| `events` | 6,000 | user_id, event_type, feature, session_id, ts |
| `revenue` | 96 | month, plan, net_mrr, new_mrr, expansion_mrr, churn_mrr |
| `support_tickets` | 2,000 | user_id, category, priority, status, first_response_hours |

Data characteristics:
- Exponential growth curve for signups (12 months of data)
- Plan-dependent churn rates (free churns more than enterprise)
- Weighted distributions for sources, industries, event types
- Realistic MRR composition with new, expansion, and churn components

Regenerate: `npx tsx scripts/generate-saas-data.ts`

### Demo Pages

| Page | URL | Highlights |
|------|-----|------------|
| SaaS Overview | `/` | KPIs, signup trends, MRR trend, user breakdowns, support volume |
| User Explorer | `#/filtered` | Dropdown filter by acquisition source, filtered KPIs and charts |
| Product Analytics | `#/analysis/growth` | Event breakdown, feature usage trends, top active users |
| Revenue & Subscriptions | `#/analysis/comparison` | MRR composition (stacked bar), plan economics, churn rates |

---

## Gotchas & Bugs Encountered

### react-day-picker v9 API change
Northstar's `calendar.tsx` used `IconLeft`/`IconRight` components which no longer exist in react-day-picker v9. Fixed by using the `Chevron` component with an `orientation` prop.

### Northstar button.tsx Tooltip dependency
The Northstar button imports `Tooltip` from `@/components/ui/tooltip` which doesn't exist in nsbi. Simplified the button to remove the tooltip wrapper and loading prop.

### Dropdown defaultValue not wiring to FilterContext
The Dropdown's `defaultValue` prop only controlled the visual display but never wrote to FilterContext on mount. This meant filtered queries received `NULL` for their template variables on initial load, returning zero rows. Fixed with:
1. Added `useEffect` in Dropdown to call `onChange(defaultValue)` on mount when value is undefined
2. Changed DashboardPage to skip filtered queries on initial load, then execute once all filter variables are set

### Port conflicts
Port 3000 conflicts with Northstar's dev server. Use `--port 3001` or any other open port.

### Stale browser code after server restart
After restarting the dev server, the browser may have cached old code because Vite's HMR WebSocket disconnects. A full page refresh (not just soft reload) is needed after server restarts.
