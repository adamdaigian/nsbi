# NSBI Roadmap

## Phase 1: Vertical Slice (DONE)

Write `.mdx` with SQL → run `nsbi dev` → see live dashboard with charts powered by DuckDB.

**Delivered:**
- MDX parser (SQL-only, adapted from Northstar)
- MDX compiler (@mdx-js/mdx evaluate())
- DuckDB engine with auto CSV/Parquet registration
- 9 chart components: LineChart, BarChart, AreaChart, BigValue, Delta, Sparkline, DataTable, ScatterPlot, EChartsRaw
- 4 layout components: Grid, Group, Divider, Tabs
- QueryProvider + withQueryData HOC for `data="query_name"` resolution
- Express + Vite middleware mode dev server
- CLI: `nsbi dev --project <dir> --port <port>`
- Northstar dark design system (CSS tokens)
- Demo dashboard with sales.csv

---

## Phase 2: Interactive Dashboards (DONE)

**Goal:** Dashboards with filters, multi-page navigation, and hot reload.

**Delivered:**
- 8 input components (Dropdown, DateRange, ButtonGroup, TextInput, MultiSelect, Slider, CheckboxFilter, DateInput)
- FilterContext for state management
- Filter variables in SQL (`${filter_name}`) with automatic re-execution
- Multi-page routing (hash-based)
- Auto-generated sidebar navigation
- Hot reload via WebSocket + chokidar
- CLI: `nsbi init`, `nsbi build`, `nsbi preview`

---

## Phase 3: Production & Competitive Parity

**Goal:** Match Evidence/Observable feature set. Ship static dashboards, run queries in the browser.

### 3.1 DuckDB WASM — P0, BLOCKS LAUNCH
- Replace server-side DuckDB with `@duckdb/duckdb-wasm` for browser builds
- Data files bundled into the static site or fetched on demand
- Enables deployment to GitHub Pages, Vercel, Netlify with no backend
- **Why P0:** Without this, nsbi requires a server. Evidence's killer feature is serverless deploy.

### 3.2 True Static Site Generation
- `nsbi build` pre-renders pages to static HTML
- Queries executed at build time, results embedded as JSON
- Zero runtime server needed for static dashboards
- Integrate with WASM for interactive queries post-load

### 3.3 Starter Templates
- `nsbi init --template blank` — empty project
- `nsbi init --template saas-metrics` — current demo (MRR, users, churn)
- `nsbi init --template sales-pipeline` — pipeline stages, win rates, rep performance
- `nsbi init --template product-analytics` — DAU/MAU, retention cohorts, feature adoption

### 3.4 VS Code Extension
- Syntax highlighting for `.mdx` with SQL blocks
- Preview pane (live dashboard in VS Code)
- Autocomplete for component props
- **Why:** Evidence has this. Table stakes for developer adoption.

### 3.5 Tree-shaken ECharts
- Replace full `echarts` import with per-component imports
- `echarts/core` + `echarts/charts` + `echarts/components`
- Significant bundle size reduction (full echarts is ~1MB)

### 3.6 Production Hardening
- Error boundaries in all chart components
- Graceful degradation when queries fail
- Config file support (`nsbi.config.ts` — title, theme, base path)
- TypeScript strict mode cleanup

### 3.7 Example Gallery & Docs Site
- Hosted site showcasing nsbi capabilities
- Each example is a standalone project users can clone
- API documentation for all components

---

## Phase 4: Differentiation (Northstar Integration)

**Goal:** Features that competitors don't have. Create upgrade path to Northstar commercial.

### 4.1 Semantic Layer Extraction
- Port Northstar's semantic layer as optional YAML config
- Define metrics (measures + dimensions) once, use everywhere
- Compile semantic queries to SQL at build time
- **Why:** Rill and Graphene have this. Evidence/Observable don't. Major differentiator.

### 4.2 AI-Assisted Chart Generation
- Natural language → MDX code generation
- "Show me monthly revenue by region" → generates SQL + BarChart
- Schema-aware: knows your tables and columns
- **Why:** Evidence Studio has this. Our Northstar AI can power this.

### 4.3 Visual Chart Builder
- GUI for creating/editing charts without writing MDX
- Drag data fields to axes, select chart type, configure options
- Live preview as you build

### 4.4 Bidirectional MDX Sync
- Visual builder generates MDX code
- Editing MDX updates the visual builder
- No lock-in to either mode — switch freely

### 4.5 Schema Explorer
- Browse DuckDB tables and columns in the UI
- Preview data, see column types and stats
- Drag columns from explorer to chart builder

### 4.6 Northstar Integration
- Use nsbi as Northstar's rendering engine (replace broken viz layer)
- Semantic layer compiles to SQL → nsbi renders
- AI assistant generates nsbi-compatible MDX
- Export dashboards from Northstar as standalone nsbi projects

### 4.7 Dashboard Templates
- Pre-built dashboard layouts (KPI row + charts grid, etc.)
- One-click apply, then customize

---

## Competitive Positioning

| Feature | nsbi | Evidence | Observable | Rill |
|---------|------|----------|------------|------|
| Authoring | MDX ✅ | Markdown | Markdown+JS | YAML |
| Client queries | Phase 3 | ✅ WASM | ✅ | ❌ |
| Static deploy | Phase 3 | ✅ | ✅ | ❌ |
| Filters | ✅ | ✅ | ✅ | ✅ |
| Metrics layer | Phase 4 | ❌ | ❌ | ✅ |
| AI authoring | Phase 4 | Studio | ❌ | ⚠️ |
| Visual builder | Phase 4 | ❌ | Notebooks | ✅ |

**Critical path:** Phase 3.1 (DuckDB WASM) must ship before public launch.
