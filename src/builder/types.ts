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
