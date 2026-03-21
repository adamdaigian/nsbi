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
