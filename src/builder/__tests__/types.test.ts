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
