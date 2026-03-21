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
    mark: { type: 'line', strokeWidth: 1.5, ...(color ? { color } : {}) },
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
