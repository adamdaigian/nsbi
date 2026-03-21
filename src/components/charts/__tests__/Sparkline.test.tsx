import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Sparkline } from '../Sparkline'

vi.mock('vega-embed', () => ({
  default: vi.fn().mockResolvedValue({ finalize: vi.fn() }),
}))

describe('Sparkline', () => {
  const data = [
    { value: 10 },
    { value: 20 },
    { value: 15 },
    { value: 25 },
  ]

  it('renders without crashing', () => {
    const { container } = render(<Sparkline data={data} y="value" />)
    expect(container.querySelector('[data-testid="vega-chart"]')).toBeTruthy()
  })

  it('accepts custom dimensions', () => {
    const { container } = render(
      <Sparkline data={data} y="value" width={200} height={40} />
    )
    expect(container).toBeTruthy()
  })
})
