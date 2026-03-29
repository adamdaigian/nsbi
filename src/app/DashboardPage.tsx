import React, { useEffect, useState } from 'react'
import yaml from 'js-yaml'
import { VegaChart } from '@/components/charts/VegaChart'
import { BigValue } from '@/components/charts/BigValue'
import { DataTable } from '@/components/charts/DataTable'
import { applyPreset } from '@/config/presets'
import { useQueryEngine } from '@/engine/EngineContext'
import { parseDocument } from '@/engine/parser'
import { compileMDX } from '@/engine/mdx-compiler'
import { QueryProvider, mdxComponents } from '@/components/mdx'

interface DashboardPageProps {
  pagePath?: string
  onTitleChange?: (title: string) => void
}

interface BigValueItem {
  'big-value': {
    data: string
    value: string
    title?: string
    format?: string
    comparison?: string
    comparisonFormat?: string
    isUpGood?: boolean
    comparisonLabel?: string
  }
}

interface ChartItem {
  chart: string
}

interface TableItem {
  table: string
}

type LayoutItem = BigValueItem | ChartItem | TableItem

interface RowLayout {
  row: LayoutItem[]
}

interface ChartDef {
  data: string
  title?: string
  preset?: string
  spec: Record<string, unknown>
}

interface TableDef {
  data: string
  title?: string
}

interface DashboardConfig {
  title?: string
  description?: string
  queries: Record<string, { sql: string }>
  layout: RowLayout[]
  charts?: Record<string, ChartDef>
  tables?: Record<string, TableDef>
}

type QueryResults = Record<string, Record<string, unknown>[]>

function isBigValue(item: LayoutItem): item is BigValueItem {
  return 'big-value' in item
}

function isChartItem(item: LayoutItem): item is ChartItem {
  return 'chart' in item
}

function isTableItem(item: LayoutItem): item is TableItem {
  return 'table' in item
}

function QueryErrorBanner({ errors }: { errors: Record<string, string> }) {
  const entries = Object.entries(errors)
  if (entries.length === 0) return null
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm space-y-1">
      {entries.map(([name, error]) => (
        <p key={name} className="text-red-400">
          <span className="font-medium">{name}:</span> {error}
        </p>
      ))}
    </div>
  )
}

export function DashboardPage({ pagePath = 'index', onTitleChange }: DashboardPageProps) {
  const engine = useQueryEngine()
  const [config, setConfig] = useState<DashboardConfig | null>(null)
  const [queryResults, setQueryResults] = useState<QueryResults>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queryErrors, setQueryErrors] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MdxContent, setMdxContent] = useState<React.ComponentType<any> | null>(null)

  // Fetch and parse page config
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setConfig(null)
      setMdxContent(null)
      setQueryResults({})
      setQueryErrors({})

      try {
        const res = await fetch(`/api/page?path=${encodeURIComponent(pagePath)}`)
        if (!res.ok) {
          const err = (await res.json()) as { error: string }
          throw new Error(err.error)
        }

        const { content, format } = (await res.json()) as { content: string; format: string }

        if (format === 'yaml') {
          const parsed = yaml.load(content) as DashboardConfig
          if (cancelled) return

          setConfig(parsed)
          onTitleChange?.(parsed.title || pagePath)

          const queryEntries = Object.entries(parsed.queries || {})
          const errors: Record<string, string> = {}
          const results = await Promise.all(
            queryEntries.map(async ([name, q]) => {
              try {
                const result = await engine.executeQuery(q.sql)
                return [name, result.rows] as [string, Record<string, unknown>[]]
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                console.error(`[nsbi] Query "${name}" failed:`, err)
                errors[name] = message
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
          setQueryErrors(errors)
        } else if (format === 'md' || format === 'mdx') {
          const doc = parseDocument(content)
          if (cancelled) return

          onTitleChange?.(doc.frontmatter.title || pagePath)

          const sqlQueries = doc.queries.filter((q): q is import('@/types/document').SQLQueryBlock => q.type === 'sql')
          const errors: Record<string, string> = {}
          const results = await Promise.all(
            sqlQueries.map(async (q) => {
              try {
                const result = await engine.executeQuery(q.sql)
                return [q.name, result.rows] as [string, Record<string, unknown>[]]
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                console.error(`[nsbi] Query "${q.name}" failed:`, err)
                errors[q.name] = message
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
          setQueryErrors(errors)

          const { Component } = await compileMDX(doc.content, mdxComponents)
          if (cancelled) return
          setMdxContent(() => Component)
        } else {
          throw new Error(`Unsupported page format: ${format}`)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [pagePath, engine, onTitleChange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4 text-red-400 text-sm max-w-lg">
          {error}
        </div>
      </div>
    )
  }

  if (MdxContent) {
    return (
      <QueryProvider results={queryResults}>
        <div className="mdx-content space-y-6">
          <QueryErrorBanner errors={queryErrors} />
          <MdxContent components={mdxComponents} />
        </div>
      </QueryProvider>
    )
  }

  if (!config) return null

  return (
    <div className="space-y-6">
      <QueryErrorBanner errors={queryErrors} />
      {config.title && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">{config.title}</h1>
          {config.description && (
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          )}
        </div>
      )}

      {config.layout.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {(row.row || []).map((item, itemIdx) => {
            if (isBigValue(item)) {
              const bv = item['big-value']
              const data = queryResults[bv.data] || []
              return (
                <div key={itemIdx} className="flex-1 min-w-0">
                  <BigValue
                    data={data}
                    value={bv.value}
                    title={bv.title}
                    format={bv.format}
                    comparison={bv.comparison}
                    comparisonFormat={bv.comparisonFormat}
                    isUpGood={bv.isUpGood}
                    comparisonLabel={bv.comparisonLabel}
                  />
                </div>
              )
            }

            if (isChartItem(item)) {
              const chartDef = config.charts?.[item.chart]
              if (!chartDef) return null

              const data = queryResults[chartDef.data] || []
              let spec = chartDef.spec || {}
              if (chartDef.preset) {
                spec = applyPreset(chartDef.preset, spec)
              }

              return (
                <div key={itemIdx} className="flex-1 min-w-0 min-h-[300px]">
                  <VegaChart
                    spec={spec}
                    data={{ table: data }}
                    title={chartDef.title}
                  />
                </div>
              )
            }

            if (isTableItem(item)) {
              const tableDef = config.tables?.[item.table]
              if (!tableDef) return null

              const data = queryResults[tableDef.data] || []
              return (
                <div key={itemIdx} className="flex-1 min-w-0">
                  <DataTable data={data} title={tableDef.title} />
                </div>
              )
            }

            return null
          })}
        </div>
      ))}
    </div>
  )
}
