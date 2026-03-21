import { describe, it, expect } from 'vitest'
import { northstarTheme, CHART_COLORS } from '../vega-theme'

describe('northstarTheme', () => {
  it('uses transparent background for theme compatibility', () => {
    expect(northstarTheme.background).toBe('transparent')
  })

  it('uses CSS custom properties for text elements', () => {
    expect(northstarTheme.title?.color).toBe('var(--foreground)')
    expect(northstarTheme.axis?.labelColor).toBe('var(--muted-foreground)')
    expect(northstarTheme.legend?.labelColor).toBe('var(--muted-foreground)')
  })

  it('uses CSS custom properties for grid and ticks', () => {
    expect(northstarTheme.axis?.gridColor).toBe('var(--border)')
    expect(northstarTheme.axis?.tickColor).toBe('var(--border)')
  })

  it('uses CSS custom property for axis domain', () => {
    expect(northstarTheme.axis?.domainColor).toBe('var(--border)')
  })

  it('exports a 5-color category palette using CSS vars', () => {
    expect(CHART_COLORS).toHaveLength(5)
    expect(northstarTheme.range?.category).toEqual(CHART_COLORS)
  })

  it('sets font family', () => {
    expect(northstarTheme.font).toBe('var(--font-geist-sans), system-ui, sans-serif')
  })
})
