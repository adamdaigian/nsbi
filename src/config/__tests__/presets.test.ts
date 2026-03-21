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
