# Markdown Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all demo pages from YAML to `.md` files with embedded SQL queries and chart components, powered by MDX compilation under the hood.

**Architecture:** DashboardPage gains a markdown rendering path that uses the existing parser (extracts SQL blocks + frontmatter) and MDX compiler. New chart wrapper components (LineChart, BarChart, AreaChart, KPI, DataTable, Grid) consume query results via React context and generate Vega-Lite specs from simple props. The API and file watcher are updated to serve/watch `.md` files. Three demo pages ship: Executive Metrics L0, Channel Analysis L1, Key Drivers L2.

**Tech Stack:** React, @mdx-js/mdx (already installed), Vega-Lite, DuckDB

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/mdx/QueryContext.tsx` | React context providing query results to MDX components |
| Create | `src/components/mdx/charts.tsx` | LineChart, BarChart, AreaChart wrappers |
| Create | `src/components/mdx/KPI.tsx` | KPI wrapper around BigValue |
| Create | `src/components/mdx/MDXDataTable.tsx` | DataTable wrapper |
| Create | `src/components/mdx/Grid.tsx` | CSS grid layout component |
| Create | `src/components/mdx/index.ts` | Barrel export + component map for MDX compiler |
| Modify | `src/app/DashboardPage.tsx` | Add markdown rendering path alongside YAML |
| Modify | `src/dev/api-middleware.ts` | Serve `.md` files, update page scanner |
| Modify | `src/dev/file-watcher.ts` | Watch `.md` files for hot reload |
| Create | `demo/pages/index.md` | Executive Metrics L0 |
| Create | `demo/pages/channel-analysis.md` | Channel Analysis L1 |
| Create | `demo/pages/key-drivers.md` | Key Drivers L2 |
| Delete | `demo/pages/index.yaml` | Replaced by index.md |
| Delete | `demo/pages/growth.yaml` | Replaced by channel-analysis.md |

---

## Task 1: MDX Chart Wrapper Components

**Files:**
- Create: `src/components/mdx/QueryContext.tsx`
- Create: `src/components/mdx/charts.tsx`
- Create: `src/components/mdx/KPI.tsx`
- Create: `src/components/mdx/MDXDataTable.tsx`
- Create: `src/components/mdx/Grid.tsx`
- Create: `src/components/mdx/index.ts`

- [ ] **Step 1: Create QueryContext**

Create `src/components/mdx/QueryContext.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";

type QueryResults = Record<string, Record<string, unknown>[]>;

const QueryContext = createContext<QueryResults>({});

export function QueryProvider({
  results,
  children,
}: {
  results: QueryResults;
  children: React.ReactNode;
}) {
  return (
    <QueryContext.Provider value={results}>{children}</QueryContext.Provider>
  );
}

export function useQueryData(name: string): Record<string, unknown>[] {
  const results = useContext(QueryContext);
  return results[name] || [];
}
```

- [ ] **Step 2: Create chart wrapper components**

Create `src/components/mdx/charts.tsx`:

```tsx
"use client";

import React from "react";
import { VegaChart } from "@/components/charts/VegaChart";
import { applyPreset } from "@/config/presets";
import { useQueryData } from "./QueryContext";

interface ChartProps {
  data: string;
  x: string;
  y: string;
  color?: string;
  title?: string;
  yFormat?: string;
  xTimeUnit?: string;
}

function buildSpec(
  preset: string,
  { x, y, color, yFormat, xTimeUnit }: Omit<ChartProps, "data" | "title">,
) {
  const xEnc: Record<string, unknown> = { field: x, type: "quantitative" };
  if (xTimeUnit) {
    xEnc.type = "temporal";
    xEnc.timeUnit = xTimeUnit;
    xEnc.title = null;
  }

  const yEnc: Record<string, unknown> = { field: y, type: "quantitative" };
  if (yFormat) {
    yEnc.axis = { format: yFormat };
  }

  const encoding: Record<string, unknown> = { x: xEnc, y: yEnc };
  if (color) {
    encoding.color = { field: color, type: "nominal" };
  }

  return applyPreset(preset, { encoding });
}

export function LineChart({ data, title, ...rest }: ChartProps) {
  const rows = useQueryData(data);
  const spec = buildSpec("line", rest);
  return <VegaChart spec={spec} data={{ table: rows }} title={title} />;
}

export function BarChart({
  data,
  title,
  stack,
  ...rest
}: ChartProps & { stack?: boolean }) {
  const rows = useQueryData(data);
  const preset = stack ? "stacked-column" : "grouped-column";
  const spec = buildSpec(preset, rest);
  return <VegaChart spec={spec} data={{ table: rows }} title={title} />;
}

export function AreaChart({ data, title, ...rest }: ChartProps) {
  const rows = useQueryData(data);
  const spec = buildSpec("stacked-area", rest);
  return <VegaChart spec={spec} data={{ table: rows }} title={title} />;
}
```

- [ ] **Step 3: Create KPI wrapper**

Create `src/components/mdx/KPI.tsx`:

```tsx
"use client";

import React from "react";
import { BigValue } from "@/components/charts/BigValue";
import { useQueryData } from "./QueryContext";

interface KPIProps {
  data: string;
  value: string;
  title?: string;
  format?: string;
  comparison?: string;
  comparisonFormat?: string;
  comparisonLabel?: string;
  isUpGood?: boolean;
}

export function KPI({ data, ...rest }: KPIProps) {
  const rows = useQueryData(data);
  return <BigValue data={rows} {...rest} />;
}
```

- [ ] **Step 4: Create MDXDataTable wrapper**

Create `src/components/mdx/MDXDataTable.tsx`:

```tsx
"use client";

import React from "react";
import { DataTable } from "@/components/charts/DataTable";
import { useQueryData } from "./QueryContext";

interface MDXDataTableProps {
  data: string;
  title?: string;
  pageSize?: number;
}

export function MDXDataTable({ data, ...rest }: MDXDataTableProps) {
  const rows = useQueryData(data);
  return <DataTable data={rows} {...rest} />;
}
```

- [ ] **Step 5: Create Grid layout component**

Create `src/components/mdx/Grid.tsx`:

```tsx
"use client";

import React from "react";

interface GridProps {
  cols?: number;
  children: React.ReactNode;
}

export function Grid({ cols = 2, children }: GridProps) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Create barrel export with component map**

Create `src/components/mdx/index.ts`:

```tsx
export { QueryProvider, useQueryData } from "./QueryContext";
export { LineChart, BarChart, AreaChart } from "./charts";
export { KPI } from "./KPI";
export { MDXDataTable } from "./MDXDataTable";
export { Grid } from "./Grid";

import type { ComponentType } from "react";
import { LineChart, BarChart, AreaChart } from "./charts";
import { KPI } from "./KPI";
import { MDXDataTable } from "./MDXDataTable";
import { Grid } from "./Grid";

/** Component map passed to the MDX compiler */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mdxComponents: Record<string, ComponentType<any>> = {
  LineChart,
  BarChart,
  AreaChart,
  KPI,
  DataTable: MDXDataTable,
  Grid,
};
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/mdx/
git commit -m "feat: add MDX chart wrapper components and query context"
```

---

## Task 2: Markdown Rendering in DashboardPage

**Files:**
- Modify: `src/app/DashboardPage.tsx`

Add a markdown rendering path that uses the parser, query engine, and MDX compiler. The existing YAML path stays intact.

- [ ] **Step 1: Add markdown rendering to DashboardPage**

Read `src/app/DashboardPage.tsx` and add imports and the MD rendering path. The full updated file:

At the top, add new imports:

```typescript
import { parseDocument } from '@/engine/parser'
import { compileMDX } from '@/engine/mdx-compiler'
import { QueryProvider, mdxComponents } from '@/components/mdx'
```

Add new state for the MDX component after the existing state declarations (around line 80):

```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MdxContent, setMdxContent] = useState<React.ComponentType<any> | null>(null)
```

In the `load()` function, replace the format check block (`if (format !== 'yaml')`) with a branching handler:

```typescript
        if (format === 'yaml') {
          const parsed = yaml.load(content) as DashboardConfig
          if (cancelled) return

          setConfig(parsed)
          onTitleChange?.(parsed.title || pagePath)

          // Execute all queries in parallel
          const queryEntries = Object.entries(parsed.queries || {})
          const results = await Promise.all(
            queryEntries.map(async ([name, q]) => {
              try {
                const result = await engine.executeQuery(q.sql)
                return [name, result.rows] as [string, Record<string, unknown>[]]
              } catch (err) {
                console.error(`[nsbi] Query "${name}" failed:`, err)
                return [name, [] as Record<string, unknown>[]] as [string, Record<string, unknown>[]]
              }
            })
          )

          if (cancelled) return

          const resultMap: QueryResults = {}
          for (const [name, rows] of results) {
            resultMap[name] = rows
          }
          setQueryResults(resultMap)
        } else if (format === 'md' || format === 'mdx') {
          // Parse markdown: extract frontmatter + SQL blocks + clean MDX content
          const doc = parseDocument(content)
          if (cancelled) return

          onTitleChange?.(doc.frontmatter.title || pagePath)

          // Execute all SQL queries in parallel
          const sqlQueries = doc.queries.filter(q => q.type === 'sql')
          const results = await Promise.all(
            sqlQueries.map(async (q) => {
              try {
                const result = await engine.executeQuery(q.sql)
                return [q.name, result.rows] as [string, Record<string, unknown>[]]
              } catch (err) {
                console.error(`[nsbi] Query "${q.name}" failed:`, err)
                return [q.name, [] as Record<string, unknown>[]] as [string, Record<string, unknown>[]]
              }
            })
          )

          if (cancelled) return

          const resultMap: QueryResults = {}
          for (const [name, rows] of results) {
            resultMap[name] = rows
          }
          setQueryResults(resultMap)

          // Compile MDX content with chart components
          const { Component } = await compileMDX(doc.content, mdxComponents)
          if (cancelled) return
          setMdxContent(() => Component)
        } else {
          throw new Error(`Unsupported page format: ${format}`)
        }
```

Add the MD rendering path to the return JSX. After the existing YAML layout rendering (`{config.layout.map(...)}`), add the MDX branch. Replace the entire return block (starting from `return (`) with:

```tsx
  // MD/MDX page rendering
  if (MdxContent) {
    return (
      <QueryProvider results={queryResults}>
        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <MdxContent components={mdxComponents} />
        </div>
      </QueryProvider>
    )
  }

  // YAML page rendering
  if (!config) return null

  return (
    <div className="space-y-6">
      {config.title && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">{config.title}</h1>
          {config.description && (
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          )}
        </div>
      )}

      {config.layout.map((row, rowIdx) => (
        // ... existing YAML rendering unchanged
```

Note: The `prose prose-invert prose-sm` classes use Tailwind Typography to style the markdown headings, paragraphs, lists, etc. If `@tailwindcss/typography` is not installed, the markdown will render unstyled — in that case, add manual text styling classes or install the plugin.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/DashboardPage.tsx
git commit -m "feat: add markdown rendering path to DashboardPage"
```

---

## Task 3: Update API and File Watcher for .md Files

**Files:**
- Modify: `src/dev/api-middleware.ts`
- Modify: `src/dev/file-watcher.ts`

- [ ] **Step 1: Update API middleware to serve .md files**

Read `src/dev/api-middleware.ts`. In the `GET /api/page` handler (around line 179), add `.md` support. The current code tries `.yaml` then `.mdx`. Add `.md` between them:

Replace the page resolution block:

```typescript
      // Try YAML first, then MD, then MDX
      const yamlPath = path.resolve(pagesDir, `${pagePath}.yaml`);
      const mdPath = path.resolve(pagesDir, `${pagePath}.md`);
      const mdxPath = path.resolve(pagesDir, `${pagePath}.mdx`);

      if (fs.existsSync(yamlPath)) {
        const content = fs.readFileSync(yamlPath, "utf-8");
        res.json({ content, format: "yaml" });
        return;
      }

      if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, "utf-8");
        res.json({ content, format: "md" });
        return;
      }

      if (fs.existsSync(mdxPath)) {
        const content = fs.readFileSync(mdxPath, "utf-8");
        res.json({ content, format: "mdx" });
        return;
      }
```

In the `scanPages` function (around line 336), update the file extension check to include `.md`:

```typescript
    } else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
```

- [ ] **Step 2: Update file watcher for .md files**

Read `src/dev/file-watcher.ts`. Update the pages watcher glob (line 35) to include `.md`:

Replace:
```typescript
  const pagesWatcher = watch(path.join(pagesDir, "**/*.mdx"), {
```
with:
```typescript
  const pagesWatcher = watch(path.join(pagesDir, "**/*.{md,mdx}"), {
```

Update the three event handlers to strip both `.md` and `.mdx` extensions. Replace each `.replace(/\.mdx$/, "")` with:
```typescript
.replace(/\.(md|mdx)$/, "")
```

There are 3 occurrences (change, add, unlink handlers).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/dev/api-middleware.ts src/dev/file-watcher.ts
git commit -m "feat: serve and watch .md files alongside .yaml and .mdx"
```

---

## Task 4: Executive Metrics L0 Page (index.md)

**Files:**
- Create: `demo/pages/index.md`
- Delete: `demo/pages/index.yaml`

Convert the existing YAML dashboard to markdown format. Same queries, same charts, same KPIs — different authoring format.

- [ ] **Step 1: Create index.md**

Read the current `demo/pages/index.yaml` to get all SQL queries and chart configurations. Create `demo/pages/index.md` that reproduces the same dashboard using the MDX components.

The file structure:
- YAML frontmatter with title/description
- All SQL queries as fenced code blocks with `-- name:` comments
- KPI rows using `<Grid>` + `<KPI>` components
- Chart rows using `<Grid>` + chart components
- `<DataTable>` for top accounts

Each SQL query from the YAML `queries:` section becomes a fenced ```sql block. Each chart becomes a `<LineChart>`, `<BarChart>`, or `<AreaChart>` component. The YAML `layout:` section maps to `<Grid>` + components.

**Important:** Copy every SQL query exactly from the current index.yaml — do not modify or simplify them. The chart component props map from the YAML encoding as follows:
- `encoding.x.field` → `x` prop
- `encoding.y.field` → `y` prop
- `encoding.color.field` → `color` prop
- `encoding.y.axis.format` → `yFormat` prop
- `encoding.x.timeUnit` → `xTimeUnit` prop
- `preset: line` → `<LineChart>`
- `preset: stacked-column` → `<BarChart stack>`
- `preset: stacked-area` → `<AreaChart>`
- `preset: grouped-column` → `<BarChart>`

- [ ] **Step 2: Delete index.yaml**

```bash
rm demo/pages/index.yaml
```

- [ ] **Step 3: Start dev server and verify the page renders**

Run: `npm run dev`

Verify:
- Page loads without errors
- All KPI cards show values with formatting
- All 10 charts render with data
- Top accounts table shows data
- Sidebar still works

- [ ] **Step 4: Commit**

```bash
git add demo/pages/index.md
git rm demo/pages/index.yaml
git commit -m "feat: convert Executive Metrics L0 from YAML to markdown"
```

---

## Task 5: Channel Analysis L1 Page (channel-analysis.md)

**Files:**
- Create: `demo/pages/channel-analysis.md`
- Delete: `demo/pages/growth.yaml`

Convert the existing growth analytics YAML dashboard to markdown, reframed as "Channel Analysis L1".

- [ ] **Step 1: Create channel-analysis.md**

Read `demo/pages/growth.yaml` to get all SQL queries. Create `demo/pages/channel-analysis.md` with:
- Title: "Channel Analysis L1"
- Description: "Acquisition funnel, account segmentation, and source attribution"
- Same SQL queries from growth.yaml as fenced ```sql blocks
- Same chart components converted to MDX syntax
- Brief section headers between chart groups (e.g., `## Acquisition Channels`, `## Segment Mix`, `## Trial Funnel`)

- [ ] **Step 2: Delete growth.yaml**

```bash
rm demo/pages/growth.yaml
```

- [ ] **Step 3: Verify the page renders**

Run: `npm run dev`, navigate to Channel Analysis in the sidebar. Verify all charts render.

- [ ] **Step 4: Commit**

```bash
git add demo/pages/channel-analysis.md
git rm demo/pages/growth.yaml
git commit -m "feat: convert Channel Analysis L1 from YAML to markdown"
```

---

## Task 6: Key Drivers L2 Page (key-drivers.md)

**Files:**
- Create: `demo/pages/key-drivers.md`

The narrative showcase page — written like a board memo with prose analysis and supporting charts. This is the page that demonstrates "look, you can write markdown with embedded charts."

- [ ] **Step 1: Create key-drivers.md**

Create `demo/pages/key-drivers.md`. The file contains:

```markdown
---
title: Key Drivers L2
description: Deep-dive on the drivers improving business outcomes
---
```

Then SQL queries for the charts used in each section (reuse queries from index.md where possible, or write focused ones):

**Section 1: The Segment Shift** — needs:
- `mrr_by_segment` query (MRR broken down by segment over time)
- `asp_trend` query (average selling price trend)

**Section 2: Retention Is Compounding** — needs:
- `churn_by_segment` query (monthly churn rate by segment)
- `retention_cohort` query (quarterly cohort retention curves)

**Section 3: The Expansion Engine** — needs:
- `net_new_mrr` query (MRR components: new, expansion, churn, downgrade)
- `expansion_pct` query (expansion as % of total new MRR)

The prose content should be substantive — 2-3 paragraphs per section analyzing what the data shows. Example tone:

```markdown
## 1. The Segment Shift

The most visible change since Series A is where our revenue comes from. In the first
six months, SMB accounts made up 70% of new signups and the average contract value
hovered around $150/month. That was fine for finding product-market fit, but it meant
high support load per dollar of revenue and limited expansion potential.

Post-Series A, we invested in enterprise sales — dedicated AEs, longer sales cycles,
and a product roadmap that prioritized the features mid-market and enterprise buyers
need (SSO, audit logs, custom integrations). The segment mix has shifted dramatically:
enterprise now represents 30% of new signups, up from 5%.

<Grid cols={2}>
<AreaChart data="mrr_by_segment" x="month" y="mrr" color="segment"
  title="MRR by Segment" yFormat="$~s" xTimeUnit="yearmonth" />
<LineChart data="asp_trend" x="month" y="asp"
  title="Average Selling Price" yFormat="$~s" xTimeUnit="yearmonth" />
</Grid>

The impact on ASP is clear: average selling price has climbed from ~$150 to over $500
per month. More importantly, these larger accounts have lower churn and higher expansion
potential — which feeds directly into the next two growth drivers.
```

Follow this pattern for all 3 sections plus an intro and conclusion.

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev`, navigate to Key Drivers L2 in the sidebar. Verify:
- Markdown prose renders with proper headings and paragraphs
- Charts render inline with the text
- The page reads like a document, not a dashboard
- SQL blocks are hidden (not visible in output)

- [ ] **Step 3: Commit**

```bash
git add demo/pages/key-drivers.md
git commit -m "feat: add Key Drivers L2 narrative dashboard"
```

---

## Task 7: Markdown Prose Styling

**Files:**
- Possibly modify: `src/app/DashboardPage.tsx` or `src/styles/globals.css`

The MDX-rendered markdown needs proper typography — headings, paragraphs, emphasis, lists. Tailwind's `prose` classes handle this if `@tailwindcss/typography` is installed.

- [ ] **Step 1: Check if Tailwind Typography is available**

Run: `grep -r "typography" package.json` and `grep -r "prose" src/styles/`

If `@tailwindcss/typography` is installed, the `prose prose-invert` classes in DashboardPage will work. If not, install it:

```bash
npm install -D @tailwindcss/typography
```

And add to `tailwind.config.ts` (or wherever Tailwind plugins are configured):

```typescript
plugins: [require('@tailwindcss/typography')]
```

If Tailwind Typography is NOT feasible (e.g., using Tailwind v4 with different plugin model), add manual styles to `src/styles/globals.css`:

```css
.mdx-content h1 { font-size: 1.75rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; color: var(--foreground); }
.mdx-content h2 { font-size: 1.375rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.5rem; color: var(--foreground); }
.mdx-content h3 { font-size: 1.125rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--foreground); }
.mdx-content p { margin-top: 0.75rem; margin-bottom: 0.75rem; color: var(--muted-foreground); line-height: 1.7; }
.mdx-content strong { color: var(--foreground); font-weight: 600; }
.mdx-content em { font-style: italic; }
.mdx-content ul, .mdx-content ol { margin: 0.75rem 0; padding-left: 1.5rem; color: var(--muted-foreground); }
.mdx-content li { margin: 0.25rem 0; }
```

Then update the DashboardPage MDX wrapper div class from `prose prose-invert prose-sm max-w-none` to `mdx-content`.

- [ ] **Step 2: Verify prose styling on Key Drivers page**

Run: `npm run dev`, check that headings, paragraphs, and emphasis render correctly on the Key Drivers L2 page.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add markdown prose styling for MDX pages"
```

---

## Task 8: End-to-End Verification

- [ ] **Step 1: Run tests**

Run: `npm test`
Expected: All tests pass (existing tests should not be affected).

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Verify all 3 pages**

Run: `npm run dev`

1. **Executive Metrics L0** — Same KPI cards, charts, and table as before. Verify formats ($~s, .0%).
2. **Channel Analysis L1** — Section headers between chart groups. All charts render.
3. **Key Drivers L2** — Prose renders as styled text. Charts inline with narrative. SQL blocks hidden.
4. **Sidebar** — Shows all 3 pages. Navigation works.
5. **Hot reload** — Edit `key-drivers.md`, save, verify page updates in browser.
