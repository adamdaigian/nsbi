import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VegaChart } from '../VegaChart'

// Mock vega-embed since it needs a real DOM canvas
vi.mock('vega-embed', () => ({
  default: vi.fn().mockResolvedValue({ finalize: vi.fn() }),
}))

describe('VegaChart', () => {
  const basicSpec = {
    mark: 'bar' as const,
    encoding: {
      x: { field: 'category', type: 'nominal' as const },
      y: { field: 'value', type: 'quantitative' as const },
    },
  }

  const sampleData = {
    source: [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
    ],
  }

  it('renders a container div', () => {
    const { container } = render(
      <VegaChart spec={basicSpec} data={sampleData} />
    )
    expect(container.querySelector('[data-testid="vega-chart"]')).toBeTruthy()
  })

  it('renders title when provided', () => {
    render(
      <VegaChart spec={basicSpec} data={sampleData} title="Test Chart" />
    )
    expect(screen.getByText('Test Chart')).toBeTruthy()
  })

  it('renders subtitle when provided', () => {
    render(
      <VegaChart
        spec={basicSpec}
        data={sampleData}
        title="Title"
        subtitle="Subtitle"
      />
    )
    expect(screen.getByText('Subtitle')).toBeTruthy()
  })

  it('renders error when data exceeds 10K rows', () => {
    const bigData = {
      source: Array.from({ length: 10001 }, (_, i) => ({
        category: `item${i}`,
        value: i,
      })),
    }
    render(<VegaChart spec={basicSpec} data={bigData} />)
    expect(screen.getByText(/exceeds the 10,000 row limit/)).toBeTruthy()
  })

  it('applies className to wrapper', () => {
    const { container } = render(
      <VegaChart spec={basicSpec} data={sampleData} className="custom" />
    )
    expect(
      container.querySelector('.custom')
    ).toBeTruthy()
  })

  it('renders without crashing when data is empty', () => {
    const { container } = render(<VegaChart spec={basicSpec} data={{}} />)
    expect(container).toBeTruthy()
    expect(screen.queryByText(/exceeds the 10,000 row limit/)).toBeNull()
  })
})
