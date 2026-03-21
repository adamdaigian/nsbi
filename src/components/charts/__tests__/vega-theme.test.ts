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
