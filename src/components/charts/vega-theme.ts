import type { Config } from 'vega-lite'

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export const northstarTheme: Config = {
  background: 'transparent',
  mark: {
    tooltip: { content: 'encoding' },
  },
  font: 'var(--font-geist-sans), system-ui, sans-serif',

  title: {
    color: 'var(--foreground)',
    fontSize: 14,
    fontWeight: 600,
  },

  axis: {
    labelColor: 'var(--muted-foreground)',
    titleColor: 'var(--foreground)',
    gridColor: 'var(--border)',
    tickColor: 'var(--border)',
    domainColor: 'var(--border)',
    labelFontSize: 11,
    titleFontSize: 12,
  },

  legend: {
    labelColor: 'var(--muted-foreground)',
    titleColor: 'var(--foreground)',
    labelFontSize: 11,
  },

  view: {
    stroke: 'transparent',
  },

  range: {
    category: CHART_COLORS,
  },
}
