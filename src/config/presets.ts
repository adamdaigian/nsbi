type PartialSpec = Record<string, unknown>

export const PRESET_NAMES = [
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
] as const

export type PresetName = (typeof PRESET_NAMES)[number]

const presets: Record<PresetName, (spec: PartialSpec) => PartialSpec> = {
  'grouped-column': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
    encoding: {
      ...(spec.encoding as Record<string, unknown>),
      xOffset: { field: ((spec.encoding as Record<string, Record<string, string>>)?.color)?.field },
    },
  }),

  'stacked-column': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
  }),

  '100-stacked-column': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'bar' },
      encoding: {
        ...enc,
        y: { ...enc.y, stack: 'normalize' },
      },
    }
  },

  'grouped-bar': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
    encoding: {
      ...(spec.encoding as Record<string, unknown>),
      yOffset: { field: ((spec.encoding as Record<string, Record<string, string>>)?.color)?.field },
    },
  }),

  'stacked-bar': (spec) => ({
    ...spec,
    mark: { type: 'bar' },
  }),

  '100-stacked-bar': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'bar' },
      encoding: {
        ...enc,
        x: { ...enc.x, stack: 'normalize' },
      },
    }
  },

  'line': (spec) => ({
    ...spec,
    mark: { type: 'line', point: true },
  }),

  'stacked-area': (spec) => ({
    ...spec,
    mark: { type: 'area' },
  }),

  '100-stacked-area': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'area' },
      encoding: {
        ...enc,
        y: { ...enc.y, stack: 'normalize' },
      },
    }
  },

  'histogram': (spec) => {
    const enc = (spec.encoding as Record<string, Record<string, unknown>>) ?? {}
    return {
      ...spec,
      mark: { type: 'bar' },
      encoding: {
        ...enc,
        x: { ...enc.x, bin: true },
        y: { aggregate: 'count', type: 'quantitative' },
      },
    }
  },

  'scatter': (spec) => ({
    ...spec,
    mark: { type: 'point' },
  }),

  'pie': (spec) => ({
    ...spec,
    mark: { type: 'arc' },
  }),
}

export function applyPreset(preset: string, userSpec: PartialSpec): PartialSpec {
  const fn = presets[preset as PresetName]
  if (!fn) return userSpec
  return fn(userSpec)
}
