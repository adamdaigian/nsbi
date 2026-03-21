import { useRef, useEffect, useState, useMemo } from 'react'
import vegaEmbed, { type Result } from 'vega-embed'
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
  height = 300,
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

    // Read container width before vega-embed mutates the DOM
    const containerWidth = containerRef.current.parentElement?.clientWidth ?? containerRef.current.clientWidth

    const fullSpec: TopLevelSpec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      ...parsedSpec,
      width: width === 'container' ? Math.max(containerWidth - 20, 100) : width,
      height: typeof height === 'number' ? height : 300,
      autosize: { type: 'fit', contains: 'padding' },
      datasets: parsedData,
    } as TopLevelSpec

    // If spec doesn't have a data reference, use first dataset
    if (!('data' in parsedSpec)) {
      const firstKey = Object.keys(parsedData)[0]
      if (firstKey) {
        (fullSpec as unknown as Record<string, unknown>).data = { name: firstKey }
      }
    }

    setError(null)

    const el = containerRef.current

    vegaEmbed(el, fullSpec, {
      actions: false,
      renderer: 'svg',
      config: northstarTheme,
    })
      .then((result) => {
        resultRef.current = result
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
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
          Dataset &quot;{name}&quot; has {rows.length.toLocaleString()} rows, which exceeds the 10,000 row limit.
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
        <div ref={containerRef} data-testid="vega-chart" style={{ overflow: 'hidden' }} />
      )}
    </div>
  )
}
