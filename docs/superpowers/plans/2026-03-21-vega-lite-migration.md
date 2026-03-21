# Vega-Lite Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ECharts with Vega-Lite as the sole charting layer, using a single `<VegaChart>` React component that assembles and renders Vega-Lite specs.

**Architecture:** A single `<VegaChart>` component receives partial Vega-Lite specs (mark + encoding), data, and optional props (title, subtitle, sizing). It assembles these into a full TopLevelSpec with the Northstar theme applied, validates the 10K row cap, and renders via `vega-embed`. Errors are caught and rendered inline per-chart. Convenience presets provide shorthand for common chart types.

**Tech Stack:** Vega-Lite v5.x, vega-embed, React 18, TypeScript, Vitest (new)

**Spec:** `docs/superpowers/specs/2026-03-21-vega-lite-migration-design.md`

**Known gaps for follow-up plans:**
- **YAML config parser** — this plan removes the MDX pipeline but does not build its YAML replacement. DashboardPage is stubbed. A separate plan is needed to build the YAML config parser that loads `queries:`, `layout:`, and `charts:` sections and renders the dashboard.
- **Interactivity** — tooltips and single-chart selections (brush, click) are specified but not implemented here. Add after the core rendering is stable.

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/components/charts/VegaChart.tsx` | Single rendering component — assembles full spec, validates data, renders via vega-embed, error handling |
| `src/components/charts/vega-theme.ts` | Northstar dark theme as a Vega config object |
| `src/config/presets.ts` | Convenience preset functions for 12 chart types |
| `src/builder/types.ts` | Rewritten — Vega-Lite-era type definitions |
| `src/ai/prompts.ts` | Rewritten — Vega-Lite component syntax in AI prompts |
| `src/components/charts/__tests__/VegaChart.test.tsx` | VegaChart component tests |
| `src/components/charts/__tests__/vega-theme.test.ts` | Theme config tests |
| `src/config/__tests__/presets.test.ts` | Preset function tests |
| `src/builder/__tests__/types.test.ts` | Builder type tests |
| `vitest.config.ts` | Test framework configuration |

### Files to Delete

| File | Reason |
|---|---|
| `src/components/charts/echarts-core.ts` | ECharts tree-shaking setup |
| `src/components/charts/useEChartsTheme.ts` | ECharts theme hook |
| `src/components/charts/LineChart.tsx` | Replaced by VegaChart + presets |
| `src/components/charts/AreaChart.tsx` | Replaced by VegaChart + presets |
| `src/components/charts/BarChart.tsx` | Replaced by VegaChart + presets |
| `src/components/charts/ScatterPlot.tsx` | Replaced by VegaChart + presets |
| `src/components/charts/EChartsRaw.tsx` | Replaced by VegaChart raw spec |
| `src/components/charts/Sparkline.tsx` | Reimplemented via VegaChart |
| `src/components/charts/ChartContainer.tsx` | Absorbed into VegaChart |
| `src/components/charts/ChartError.tsx` | Absorbed into VegaChart |
| `src/components/charts/ChartErrorBoundary.tsx` | Absorbed into VegaChart |
| `src/components/QueryContext.tsx` | Replaced by direct data passing |
| `src/components/withQueryData.tsx` | No HOC needed |
| `src/components/registry.ts` | MDX registry obsolete |
| `src/builder/codegen.ts` | No MDX codegen needed |
| `src/builder/parse-mdx.ts` | No MDX parsing needed |
| `src/builder/sync.ts` | Spec is single source of truth |

### Files to Modify

| File | Change |
|---|---|
| `package.json` | Remove echarts deps, add vega deps + vitest |
| `src/components/index.ts` | Update exports for new component set |

---

## Tasks

### Task 1: Set Up Test Framework

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest and testing dependencies**

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

- [ ] **Step 3: Add test script to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run vitest to verify setup**

Run: `npx vitest run`
Expected: "No test files found" (no error)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test framework"
```

---

### Task 2: Install Vega-Lite Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install vega ecosystem packages**

```bash
npm install vega vega-lite vega-embed
```

- [ ] **Step 2: Verify installation**

Run: `node -e "require('vega-lite'); console.log('vega-lite OK')"`
Expected: "vega-lite OK"

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vega, vega-lite, vega-embed dependencies"
```

---

### Task 3: Vega Theme Config

**Files:**
- Create: `src/components/charts/vega-theme.ts`
- Create: `src/components/charts/__tests__/vega-theme.test.ts`

- [ ] **Step 1: Write failing test for theme config**

Create `src/components/charts/__tests__/vega-theme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { northstarTheme, CHART_COLORS } from '../vega-theme'

describe('northstarTheme', () => {
  it('sets Neural Black background', () => {
    expect(northstarTheme.background).toBe('#0A0B0B')
  })

  it('sets Optic White for text elements', () => {
    expect(northstarTheme.title?.color).toBe('#FFFFFF')
    expect(northstarTheme.axis?.labelColor).toBe('#FFFFFF')
    expect(northstarTheme.legend?.labelColor).toBe('#FFFFFF')
  })

  it('sets Cyber Silber for grid and ticks', () => {
    expect(northstarTheme.axis?.gridColor).toBe('#949494')
    expect(northstarTheme.axis?.tickColor).toBe('#949494')
  })

  it('sets border color for axis domain', () => {
    expect(northstarTheme.axis?.domainColor).toBe('rgba(148,148,148,0.12)')
  })

  it('exports a 5-color category palette', () => {
    expect(CHART_COLORS).toHaveLength(5)
    expect(northstarTheme.range?.category).toEqual(CHART_COLORS)
  })

  it('sets font family', () => {
    expect(northstarTheme.font).toBe('var(--font-geist-sans), system-ui, sans-serif')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/charts/__tests__/vega-theme.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement vega-theme.ts**

Create `src/components/charts/vega-theme.ts`:

```typescript
import type { Config } from 'vega-lite'

export const CHART_COLORS = [
  '#5A7B8F',
  '#8B7BA8',
  '#2C4A5A',
  '#949494',
  '#6B8E9F',
]

export const northstarTheme: Config = {
  background: '#0A0B0B',
  font: 'var(--font-geist-sans), system-ui, sans-serif',

  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 600,
  },

  axis: {
    labelColor: '#FFFFFF',
    titleColor: '#FFFFFF',
    gridColor: '#949494',
    tickColor: '#949494',
    domainColor: 'rgba(148,148,148,0.12)',
    labelFontSize: 11,
    titleFontSize: 12,
  },

  legend: {
    labelColor: '#FFFFFF',
    titleColor: '#FFFFFF',
    labelFontSize: 11,
  },

  view: {
    stroke: 'transparent',
  },

  range: {
    category: CHART_COLORS,
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/charts/__tests__/vega-theme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/vega-theme.ts src/components/charts/__tests__/vega-theme.test.ts
git commit -m "feat: add Northstar Vega-Lite theme config"
```

---

### Task 4: VegaChart Core Component

**Files:**
- Create: `src/components/charts/VegaChart.tsx`
- Create: `src/components/charts/__tests__/VegaChart.test.tsx`

- [ ] **Step 1: Write failing tests for VegaChart**

Create `src/components/charts/__tests__/VegaChart.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VegaChart } from '../VegaChart'

// Mock vega-embed since it needs a real DOM canvas
vi.mock('vega-embed', () => ({
  default: vi.fn().mockResolvedValue({ finalize: vi.fn() }),
}))

describe('VegaChart', () => {
  const basicSpec = {
    mark: 'bar' as const,
    encoding: {
      x: { field: 'category', type: 'nominal' as const },
      y: { field: 'value', type: 'quantitative' as const },
    },
  }

  const sampleData = {
    source: [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
    ],
  }

  it('renders a container div', () => {
    const { container } = render(
      <VegaChart spec={basicSpec} data={sampleData} />
    )
    expect(container.querySelector('[data-testid="vega-chart"]')).toBeTruthy()
  })

  it('renders title when provided', () => {
    render(
      <VegaChart spec={basicSpec} data={sampleData} title="Test Chart" />
    )
    expect(screen.getByText('Test Chart')).toBeTruthy()
  })

  it('renders subtitle when provided', () => {
    render(
      <VegaChart
        spec={basicSpec}
        data={sampleData}
        title="Title"
        subtitle="Subtitle"
      />
    )
    expect(screen.getByText('Subtitle')).toBeTruthy()
  })

  it('renders error when data exceeds 10K rows', () => {
    const bigData = {
      source: Array.from({ length: 10001 }, (_, i) => ({
        category: `item${i}`,
        value: i,
      })),
    }
    render(<VegaChart spec={basicSpec} data={bigData} />)
    expect(screen.getByText(/exceeds the 10,000 row limit/)).toBeTruthy()
  })

  it('applies className to wrapper', () => {
    const { container } = render(
      <VegaChart spec={basicSpec} data={sampleData} className="custom" />
    )
    expect(
      container.querySelector('.custom')
    ).toBeTruthy()
  })

  it('renders without crashing when data is empty', () => {
    const { container } = render(<VegaChart spec={basicSpec} data={{}} />)
    // Should render the chart container — vega-embed will handle missing data
    // (error shows asynchronously via the error state, tested via vega-embed mock)
    expect(container).toBeTruthy()
    expect(screen.queryByText(/exceeds the 10,000 row limit/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/charts/__tests__/VegaChart.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement VegaChart component**

Create `src/components/charts/VegaChart.tsx`:

```tsx
import { useRef, useEffect, useState, useMemo } from 'react'
import embed, { type Result } from 'vega-embed'
import { northstarTheme } from './vega-theme'
import type { TopLevelSpec } from 'vega-lite'

const MAX_ROWS = 10_000

export interface VegaChartProps {
  spec: Record<string, unknown>
  data: Record<string, unknown[]>
  title?: string
  subtitle?: string
  width?: number | 'container'
  height?: number | 'container'
  className?: string
}

export function VegaChart({
  spec,
  data,
  title,
  subtitle,
  width = 'container',
  height = 'container',
  className,
}: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Stabilize object references to prevent re-renders
  const specKey = useMemo(() => JSON.stringify(spec), [spec])
  const dataKey = useMemo(() => JSON.stringify(data), [data])

  // Validate row cap
  const rowCapError = Object.entries(data).find(
    ([, rows]) => rows.length > MAX_ROWS
  )

  useEffect(() => {
    if (!containerRef.current || rowCapError) return

    const parsedSpec = JSON.parse(specKey)
    const parsedData = JSON.parse(dataKey)

    const fullSpec: TopLevelSpec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      ...parsedSpec,
      width: width === 'container' ? undefined : width,
      height: height === 'container' ? undefined : height,
      datasets: parsedData,
    } as TopLevelSpec

    // If spec doesn't have a data reference, use first dataset
    if (!('data' in parsedSpec)) {
      const firstKey = Object.keys(parsedData)[0]
      if (firstKey) {
        (fullSpec as Record<string, unknown>).data = { name: firstKey }
      }
    }

    setError(null)

    const el = containerRef.current

    embed(el, fullSpec, {
      actions: false,
      renderer: 'svg',
      config: northstarTheme,
    })
      .then((result) => {
        resultRef.current = result
        // Responsive resize: re-render on container size changes
        if (width === 'container') {
          const ro = new ResizeObserver(() => {
            result.view
              .width(el.clientWidth)
              .run()
          })
          ro.observe(el)
          // Store observer for cleanup
          ;(result as unknown as Record<string, unknown>).__ro = ro
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      const ro = (resultRef.current as unknown as Record<string, unknown>)?.__ro as ResizeObserver | undefined
      ro?.disconnect()
      resultRef.current?.finalize()
      resultRef.current = null
    }
  }, [specKey, dataKey, width, height, rowCapError])

  if (rowCapError) {
    const [name, rows] = rowCapError
    return (
      <div className={className}>
        {title && <h3 className="text-white text-sm font-semibold mb-1">{title}</h3>}
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4 text-red-400 text-sm">
          Dataset "{name}" has {rows.length.toLocaleString()} rows, which exceeds the 10,000 row limit.
          Aggregate your data in the SQL query to reduce the row count.
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {title && (
        <h3 className="text-white text-sm font-semibold mb-1">{title}</h3>
      )}
      {subtitle && (
        <p className="text-gray-400 text-xs mb-2">{subtitle}</p>
      )}
      {error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4 text-red-400 text-sm">
          Chart error: {error}
        </div>
      ) : (
        <div ref={containerRef} data-testid="vega-chart" />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/charts/__tests__/VegaChart.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/VegaChart.tsx src/components/charts/__tests__/VegaChart.test.tsx
git commit -m "feat: add VegaChart core rendering component"
```

---

### Task 5: Convenience Presets

**Files:**
- Create: `src/config/presets.ts`
- Create: `src/config/__tests__/presets.test.ts`

- [ ] **Step 1: Write failing tests for presets**

Create `src/config/__tests__/presets.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyPreset, PRESET_NAMES } from '../presets'

describe('applyPreset', () => {
  it('returns spec unchanged for unknown preset', () => {
    const spec = { mark: 'point', encoding: {} }
    expect(applyPreset('unknown', spec)).toEqual(spec)
  })

  it('applies grouped-column preset', () => {
    const result = applyPreset('grouped-column', {
      encoding: {
        x: { field: 'month', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
        color: { field: 'category', type: 'nominal' },
      },
    })
    expect(result.mark).toEqual({ type: 'bar' })
    expect((result.encoding as Record<string, unknown>).xOffset).toBeTruthy()
  })

  it('applies stacked-column preset (default stack behavior)', () => {
    const result = applyPreset('stacked-column', {
      encoding: {
        x: { field: 'month' },
        y: { field: 'value' },
        color: { field: 'category' },
      },
    })
    expect(result.mark).toEqual({ type: 'bar' })
    // Vega-Lite bars stack by default when color is present — no explicit stack needed
    expect((result.encoding as Record<string, { stack?: string }>).y?.stack).not.toBe('normalize')
  })

  it('applies 100-stacked-column preset', () => {
    const result = applyPreset('100-stacked-column', {
      encoding: {
        x: { field: 'month' },
        y: { field: 'value' },
        color: { field: 'category' },
      },
    })
    expect((result.encoding as Record<string, { stack?: string }>).y?.stack).toBe('normalize')
  })

  it('applies grouped-bar preset (horizontal)', () => {
    const result = applyPreset('grouped-bar', {
      encoding: {
        x: { field: 'value' },
        y: { field: 'category' },
        color: { field: 'group' },
      },
    })
    expect(result.mark).toEqual({ type: 'bar' })
    expect((result.encoding as Record<string, unknown>).yOffset).toBeTruthy()
  })

  it('applies line preset', () => {
    const result = applyPreset('line', {
      encoding: {
        x: { field: 'month' },
        y: { field: 'value' },
      },
    })
    expect(result.mark).toEqual({ type: 'line', point: true })
  })

  it('applies stacked-area preset', () => {
    const result = applyPreset('stacked-area', {
      encoding: {
        x: { field: 'month' },
        y: { field: 'value' },
        color: { field: 'category' },
      },
    })
    expect(result.mark).toEqual({ type: 'area' })
  })

  it('applies histogram preset', () => {
    const result = applyPreset('histogram', {
      encoding: {
        x: { field: 'value' },
      },
    })
    expect(result.mark).toEqual({ type: 'bar' })
    expect((result.encoding as Record<string, unknown>).x).toHaveProperty('bin')
    expect((result.encoding as Record<string, unknown>).y).toHaveProperty('aggregate')
  })

  it('applies scatter preset', () => {
    const result = applyPreset('scatter', {
      encoding: {
        x: { field: 'weight' },
        y: { field: 'height' },
      },
    })
    expect(result.mark).toEqual({ type: 'point' })
  })

  it('applies pie preset', () => {
    const result = applyPreset('pie', {
      encoding: {
        color: { field: 'category' },
        theta: { field: 'value' },
      },
    })
    expect(result.mark).toEqual({ type: 'arc' })
  })

  it('exports all 12 preset names', () => {
    expect(PRESET_NAMES).toHaveLength(12)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/__tests__/presets.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement presets**

Create `src/config/presets.ts`:

```typescript
type PartialSpec = Record<string, unknown>

export const PRESET_NAMES = [
  'grouped-column',
  'stacked-column',
  '100-stacked-column',
  'grouped-bar',
  'stacked-bar',
  '100-stacked-bar',
  'line',
  'stacked-area',
  '100-stacked-area',
  'histogram',
  'scatter',
  'pie',
] as const

export type PresetName = (typeof PRESET_NAMES)[number]

const presets: Record<PresetName, (spec: PartialSpec) => PartialSpec> = {
  'grouped-column': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
    encoding: {
      ...(spec.encoding as Record<string, unknown>),
      xOffset: { field: ((spec.encoding as Record<string, Record<string, string>>)?.color)?.field },
    },
  }),

  'stacked-column': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
  }),

  '100-stacked-column': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'bar' },
      encoding: {
        ...enc,
        y: { ...enc.y, stack: 'normalize' },
      },
    }
  },

  'grouped-bar': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
    encoding: {
      ...(spec.encoding as Record<string, unknown>),
      yOffset: { field: ((spec.encoding as Record<string, Record<string, string>>)?.color)?.field },
    },
  }),

  'stacked-bar': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
  }),

  '100-stacked-bar': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'bar' },
      encoding: {
        ...enc,
        x: { ...enc.x, stack: 'normalize' },
      },
    }
  },

  'line': (spec) => ({
    ...spec,
    mark: { type: 'line', point: true },
  }),

  'stacked-area': (spec) => ({
    ...spec,
    mark: { type: 'area' },
  }),

  '100-stacked-area': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'area' },
      encoding: {
        ...enc,
        y: { ...enc.y, stack: 'normalize' },
      },
    }
  },

  'histogram': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'bar' },
      encoding: {
        ...enc,
        x: { ...enc.x, bin: true },
        y: { aggregate: 'count', type: 'quantitative' },
      },
    }
  },

  'scatter': (spec) => ({
    ...spec,
    mark: { type: 'point' },
  }),

  'pie': (spec) => ({
    ...spec,
    mark: { type: 'arc' },
  }),
}

export function applyPreset(preset: string, userSpec: PartialSpec): PartialSpec {
  const fn = presets[preset as PresetName]
  if (!fn) return userSpec
  return fn(userSpec)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/__tests__/presets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/presets.ts src/config/__tests__/presets.test.ts
git commit -m "feat: add convenience presets for 12 chart types"
```

---

### Task 6: Rewrite Builder Types

**Files:**
- Modify: `src/builder/types.ts`
- Create: `src/builder/__tests__/types.test.ts`

- [ ] **Step 1: Write failing tests for new builder types**

Create `src/builder/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  CHART_TYPES,
  isChartSpec,
  type ChartType,
  type ChartSpec,
  type QuerySpec,
  type PageSpec,
} from '../types'

describe('builder types', () => {
  it('defines 13 chart types (12 Vega-Lite + table)', () => {
    expect(CHART_TYPES).toHaveLength(13)
    expect(CHART_TYPES).toContain('grouped-column')
    expect(CHART_TYPES).toContain('line')
    expect(CHART_TYPES).toContain('scatter')
    expect(CHART_TYPES).toContain('pie')
    expect(CHART_TYPES).toContain('table')
  })

  it('does not contain ECharts-era type names', () => {
    expect(CHART_TYPES).not.toContain('LineChart')
    expect(CHART_TYPES).not.toContain('BarChart')
    expect(CHART_TYPES).not.toContain('EChartsRaw')
  })

  it('isChartSpec identifies chart specs', () => {
    const chart: ChartSpec = {
      id: 'test',
      type: 'line',
      dataSource: 'revenue',
      spec: { mark: 'line', encoding: {} },
    }
    expect(isChartSpec(chart)).toBe(true)
    expect(isChartSpec({ type: 'grid', children: [] })).toBe(false)
  })

  it('ChartSpec includes Vega-Lite partial spec', () => {
    const chart: ChartSpec = {
      id: 'mrr',
      type: 'stacked-column',
      dataSource: 'revenue',
      title: 'MRR',
      preset: 'stacked-column',
      spec: {
        encoding: {
          x: { field: 'month', type: 'temporal' },
          y: { field: 'mrr', type: 'quantitative' },
          color: { field: 'category', type: 'nominal' },
        },
      },
    }
    expect(chart.spec.encoding).toBeDefined()
    expect(chart.preset).toBe('stacked-column')
  })

  it('QuerySpec supports sql and semantic types', () => {
    const sqlQuery: QuerySpec = { name: 'rev', type: 'sql', sql: 'SELECT 1' }
    const semQuery: QuerySpec = {
      name: 'rev',
      type: 'semantic',
      semantic: {
        topic: 'revenue',
        dimensions: ['month'],
        measures: ['mrr'],
      },
    }
    expect(sqlQuery.type).toBe('sql')
    expect(semQuery.type).toBe('semantic')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/builder/__tests__/types.test.ts`
Expected: FAIL — imports don't match new interface

- [ ] **Step 3: Rewrite builder types**

Replace the contents of `src/builder/types.ts` with:

```typescript
export const CHART_TYPES = [
  'grouped-column',
  'stacked-column',
  '100-stacked-column',
  'grouped-bar',
  'stacked-bar',
  '100-stacked-bar',
  'line',
  'stacked-area',
  '100-stacked-area',
  'histogram',
  'scatter',
  'pie',
  'table',
] as const

export type ChartType = (typeof CHART_TYPES)[number]

export interface ChartSpec {
  id: string
  type: ChartType
  dataSource: string
  title?: string
  subtitle?: string
  preset?: string
  spec: Record<string, unknown>
}

export interface QuerySpec {
  name: string
  type: 'sql' | 'semantic'
  sql?: string
  semantic?: {
    topic: string
    dimensions: string[]
    measures: string[]
    timeGrain?: string
    filters?: unknown[]
    orderBy?: unknown[]
    limit?: number
  }
}

export interface GridLayoutSpec {
  type: 'grid'
  columns?: number
  children: LayoutSpec[]
}

export interface GroupLayoutSpec {
  type: 'group'
  title: string
  children: LayoutSpec[]
}

export interface TabsLayoutSpec {
  type: 'tabs'
  tabs: { label: string; children: LayoutSpec[] }[]
}

export type LayoutSpec = GridLayoutSpec | GroupLayoutSpec | TabsLayoutSpec | ChartSpec

export interface PageSpec {
  title: string
  description?: string
  queries: QuerySpec[]
  layout: LayoutSpec[]
}

export function isChartSpec(item: unknown): item is ChartSpec {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'type' in item &&
    'dataSource' in item &&
    CHART_TYPES.includes((item as ChartSpec).type)
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/builder/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/builder/types.ts src/builder/__tests__/types.test.ts
git commit -m "feat: rewrite builder types for Vega-Lite architecture"
```

---

### Task 7: Update AI Prompts

**Files:**
- Modify: `src/ai/prompts.ts`

The AI system prompt currently teaches Claude to generate ECharts-based MDX components. It needs to teach Vega-Lite spec generation in YAML config format instead.

- [ ] **Step 1: Read current prompts.ts**

Read `src/ai/prompts.ts` for full context.

- [ ] **Step 2: Replace the entire file with the Vega-Lite version**

Write the complete replacement for `src/ai/prompts.ts`:

```typescript
import type { SchemaMetadata } from "@/types/schema";

interface TopicContext {
  name: string;
  label?: string;
  dimensions: string[];
  measures: string[];
}

interface NsbiPromptContext {
  schema?: SchemaMetadata;
  topics?: TopicContext[];
  existingContent?: string;
}

export function buildNsbiSystemPrompt(context: NsbiPromptContext): string {
  const schemaSection = context.schema?.tables.length
    ? context.schema.tables
        .map(
          (t) =>
            `- ${t.name} (${t.rowCount.toLocaleString()} rows): ${t.columns.map((c) => `${c.name}:${c.type}`).join(", ")}`,
        )
        .join("\n")
    : "No tables loaded yet.";

  const topicsList = context.topics?.length
    ? context.topics
        .map(
          (t) =>
            `- ${t.name}${t.label ? ` (${t.label})` : ""}: dimensions=[${t.dimensions.join(", ")}], measures=[${t.measures.join(", ")}]`,
        )
        .join("\n")
    : "No semantic topics configured.";

  return `You are a dashboard creation assistant for nsbi, a BI-as-Code framework.
You help users create and modify dashboard YAML config files with Vega-Lite chart specs.
The database engine is DuckDB.

## Dashboard Config Format (YAML)

Dashboards are defined as YAML files with three top-level sections: queries, layout, and charts.

### Queries

SQL queries (direct DuckDB SQL):
\`\`\`yaml
queries:
  revenue:
    sql: SELECT month, mrr, category FROM metrics
\`\`\`

Semantic queries (uses the semantic layer, if topics are configured):
\`\`\`yaml
queries:
  revenue_by_month:
    type: semantic
    semantic:
      topic: orders
      dimensions: [order_date]
      measures: [total_revenue]
      timeGrain: MONTH
\`\`\`

### Layout

\`\`\`yaml
layout:
  - row:
    - chart: mrr_trend
    - chart: churn_rate
  - row:
    - chart: detail_table
\`\`\`

### Charts (Vega-Lite Specs)

Using presets (recommended for common charts):
\`\`\`yaml
charts:
  revenue_trend:
    data: revenue
    title: Monthly Revenue
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal }
        y: { field: mrr, type: quantitative }

  category_breakdown:
    data: revenue
    title: Revenue by Category
    preset: stacked-column
    spec:
      encoding:
        x: { field: month, type: temporal }
        y: { field: mrr, type: quantitative }
        color: { field: category, type: nominal }
\`\`\`

Available presets: grouped-column, stacked-column, 100-stacked-column, grouped-bar, stacked-bar, 100-stacked-bar, line, stacked-area, 100-stacked-area, histogram, scatter, pie

Raw Vega-Lite spec (for advanced charts):
\`\`\`yaml
charts:
  custom_chart:
    data: metrics
    title: Custom Visualization
    spec:
      mark: { type: point, size: 100 }
      encoding:
        x: { field: weight, type: quantitative }
        y: { field: height, type: quantitative }
        color: { field: species, type: nominal }
        size: { field: count, type: quantitative }
\`\`\`

Tables (TanStack Table, not Vega-Lite):
\`\`\`yaml
charts:
  detail_table:
    type: table
    data: transactions
    title: Recent Transactions
\`\`\`

KPI values (pure React, not Vega-Lite):
\`\`\`yaml
charts:
  total_revenue:
    type: big-value
    data: summary
    value: mrr
    comparison: prev_mrr
    format: usd0
\`\`\`

### Format Strings

For axis/value formatting: usd0, usd2, pct, pct0, num0, num2, date, datetime, month

## DuckDB Schema
\${schemaSection}

## Semantic Topics
\${topicsList}

## Guidelines
1. Always define queries before referencing them in charts.
2. Use semantic queries when a matching topic exists.
3. Use multi-column rows in layout for side-by-side charts.
4. Include descriptive titles for all charts.
5. When modifying existing content, return the complete updated YAML.
6. Each query must have a unique name that charts reference via \\\`data\\\`.
7. Use presets for standard chart types; raw Vega-Lite specs for custom visualizations.
8. Vega-Lite encoding types: temporal, quantitative, nominal, ordinal.
9. DuckDB SQL syntax: use double quotes for identifiers, single quotes for strings.

\${context.existingContent ? \`\\n## Current Dashboard Content\\n\\\`\\\`\\\`yaml\\n\${context.existingContent}\\n\\\`\\\`\\\`\` : ""}`;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 4: Commit**

```bash
git add src/ai/prompts.ts
git commit -m "feat: update AI prompts for Vega-Lite YAML config generation"
```

---

### Task 8: Update Component Exports

**Files:**
- Modify: `src/components/index.ts`

- [ ] **Step 1: Read current index.ts**

Read `src/components/index.ts` to see all current exports.

- [ ] **Step 2: Rewrite exports**

Replace the contents of `src/components/index.ts` to export only the components that survive the migration:

```typescript
// Charts
export { VegaChart } from './charts/VegaChart'
export type { VegaChartProps } from './charts/VegaChart'
export { northstarTheme, CHART_COLORS } from './charts/vega-theme'

// Non-chart components (retained as-is)
export { BigValue } from './charts/BigValue'
export { Delta } from './charts/Delta'
export { DataTable } from './charts/DataTable'

// Layout
export { Grid } from './layout/Grid'
export { Group } from './layout/Group'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './layout/Tabs'
export { Divider } from './layout/Divider'

// Inputs
export { Dropdown } from './inputs/Dropdown'
export { MultiSelect } from './inputs/MultiSelect'
export { ButtonGroup } from './inputs/ButtonGroup'
export { TextInput } from './inputs/TextInput'
export { Slider } from './inputs/Slider'
export { DateInput } from './inputs/DateInput'
export { DateRange } from './inputs/DateRange'
export { CheckboxFilter } from './inputs/CheckboxFilter'
export { FilterProvider, useFilterValue } from './inputs/FilterContext'
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors from files still importing old components (expected — we delete those files in Task 9)

- [ ] **Step 4: Commit**

```bash
git add src/components/index.ts
git commit -m "feat: update component exports for Vega-Lite architecture"
```

---

### Task 9: Remove ECharts Files and Dependencies

**Files:**
- Delete: 14 files (see list below)
- Modify: `package.json`

- [ ] **Step 1: Remove ECharts npm dependencies**

```bash
npm uninstall echarts echarts-for-react
```

- [ ] **Step 2: Delete ECharts chart components**

```bash
rm src/components/charts/echarts-core.ts
rm src/components/charts/useEChartsTheme.ts
rm src/components/charts/LineChart.tsx
rm src/components/charts/AreaChart.tsx
rm src/components/charts/BarChart.tsx
rm src/components/charts/ScatterPlot.tsx
rm src/components/charts/EChartsRaw.tsx
rm src/components/charts/Sparkline.tsx
```

- [ ] **Step 3: Delete infrastructure files replaced by new architecture**

```bash
rm src/components/charts/ChartContainer.tsx
rm src/components/charts/ChartError.tsx
rm src/components/charts/ChartErrorBoundary.tsx
rm src/components/QueryContext.tsx
rm src/components/withQueryData.tsx
rm src/components/registry.ts
```

- [ ] **Step 4: Delete builder files replaced by new architecture**

```bash
rm src/builder/codegen.ts
rm src/builder/parse-mdx.ts
rm src/builder/sync.ts
```

- [ ] **Step 5: Fix remaining import references**

Search for imports of deleted files:

```bash
grep -r "echarts-core\|useEChartsTheme\|LineChart\|AreaChart\|BarChart\|ScatterPlot\|EChartsRaw\|ChartContainer\|ChartError\|ChartErrorBoundary\|QueryContext\|withQueryData\|registry" src/ --include="*.ts" --include="*.tsx" -l
```

For each file found, remove dead imports. The most significant file is `src/app/DashboardPage.tsx`, which is deeply coupled to the MDX pipeline (imports `vizRegistry`, `QueryProvider`, `compileMDX`, and wraps its render in `<QueryProvider>`). **Replace it with a stub** since the YAML config parser hasn't been built yet:

Replace `src/app/DashboardPage.tsx` with:

```tsx
import React from 'react'

interface DashboardPageProps {
  pagePath?: string
  onTitleChange?: (title: string) => void
}

/**
 * TODO: Reimplement with YAML config parser.
 * Previously orchestrated: fetch MDX → parse → execute queries → compile MDX → render.
 * New flow will be: load YAML config → execute queries → render VegaChart components.
 */
export function DashboardPage({ pagePath = 'index', onTitleChange }: DashboardPageProps) {
  React.useEffect(() => {
    onTitleChange?.(`Dashboard: ${pagePath}`)
  }, [pagePath, onTitleChange])

  return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <p>Dashboard rendering is being migrated to YAML config + Vega-Lite.</p>
    </div>
  )
}
```

For other affected files (`src/components/builder/` UI files, `src/components/schema/`), remove dead imports and comment out any code that references deleted modules with a `// TODO: reconnect after YAML config parser` note.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors from deleted files. Some errors may remain from files that need further rework (DashboardPage.tsx) — these are expected and will be addressed when the YAML config parser is built.

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (theme, VegaChart, presets, builder types)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: remove ECharts dependencies and legacy infrastructure"
```

---

### Task 10: Sparkline Reimplementation

**Files:**
- Create: `src/components/charts/Sparkline.tsx` (new implementation)

The old Sparkline used ECharts. The new one renders a minimal Vega-Lite spec through VegaChart — an inline line with no axes, legend, or title.

- [ ] **Step 1: Write failing test**

Add to `src/components/charts/__tests__/VegaChart.test.tsx` (or create a new test file):

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Sparkline } from '../Sparkline'

describe('Sparkline', () => {
  const data = [
    { value: 10 },
    { value: 20 },
    { value: 15 },
    { value: 25 },
  ]

  it('renders without crashing', () => {
    const { container } = render(<Sparkline data={data} y="value" />)
    expect(container.querySelector('[data-testid="vega-chart"]')).toBeTruthy()
  })

  it('accepts custom dimensions', () => {
    const { container } = render(
      <Sparkline data={data} y="value" width={200} height={40} />
    )
    expect(container).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run`
Expected: FAIL — Sparkline not found

- [ ] **Step 3: Implement Sparkline**

Create `src/components/charts/Sparkline.tsx`:

```tsx
import { VegaChart } from './VegaChart'

export interface SparklineProps {
  data: Record<string, unknown>[]
  y: string
  width?: number
  height?: number
  color?: string
}

export function Sparkline({
  data,
  y,
  width = 120,
  height = 32,
  color,
}: SparklineProps) {
  const spec: Record<string, unknown> = {
    mark: { type: 'line', strokeWidth: 1.5, color },
    encoding: {
      x: {
        field: '_index',
        type: 'quantitative',
        axis: null,
        scale: { zero: false },
      },
      y: {
        field: y,
        type: 'quantitative',
        axis: null,
        scale: { zero: false },
      },
    },
    config: {
      view: { stroke: null },
    },
  }

  const indexedData = data.map((row, i) => ({ ...row, _index: i }))

  return (
    <VegaChart
      spec={spec}
      data={{ source: indexedData }}
      width={width}
      height={height}
    />
  )
}
```

- [ ] **Step 4: Export Sparkline from index.ts**

Add to `src/components/index.ts`:

```typescript
export { Sparkline } from './charts/Sparkline'
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/charts/Sparkline.tsx src/components/index.ts
git commit -m "feat: reimplement Sparkline using VegaChart"
```

---

### Task 11: End-to-End Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript type checking**

Run: `npx tsc --noEmit`
Expected: No errors (or document known pre-existing errors)

- [ ] **Step 3: Verify bundle doesn't include ECharts**

```bash
grep -r "echarts" src/ --include="*.ts" --include="*.tsx"
```

Expected: No matches (ECharts completely removed)

- [ ] **Step 4: Verify Vega-Lite is the only charting dependency**

```bash
node -e "const p = require('./package.json'); console.log('echarts' in p.dependencies ? 'FAIL: echarts still present' : 'OK: echarts removed'); console.log('vega-lite' in p.dependencies ? 'OK: vega-lite present' : 'FAIL: vega-lite missing')"
```

Expected: "OK: echarts removed" and "OK: vega-lite present"

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: verify Vega-Lite migration complete"
```
