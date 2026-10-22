// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import MoodHeatmap from './MoodHeatmap'
import { contrastRatio } from '../utils/contrast'
import { colors } from '../theme/colors'

const today = new Date()
const iso = (offset) => {
  const d = new Date(today)
  d.setDate(d.getDate() - offset)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const mountWithLevels = () => {
  const notes = [1, 2, 3, 4, 5].map((n) => ({ date: iso(n), feel: n }))
  const { container } = render(<MoodHeatmap feelingNotes={notes} />)
  const fills = new Map()
  for (const r of container.querySelectorAll('rect')) {
    const t = r.querySelector('title')?.textContent ?? ''
    fills.set(t, { fill: r.getAttribute('fill'), stroke: r.getAttribute('stroke') })
  }
  return { container, fills, byDate: (d) => fills.get([...fills.keys()].find((k) => k.startsWith(d))) }
}

describe('MoodHeatmap legibility on the white card it sits on', () => {
  it('shows every logged level as a distinct fill that stands out from the card', () => {
    const { byDate } = mountWithLevels()
    const levels = [1, 2, 3, 4, 5].map((n) => byDate(iso(n)).fill)
    expect(new Set(levels).size).toBe(5)
    for (const f of levels) expect(contrastRatio(f, colors.paper), f).toBeGreaterThanOrEqual(1.5)
  })

  it('draws an empty day as an outlined cell so the grid never looks blank', () => {
    const { byDate } = mountWithLevels()
    const empty = byDate(iso(40))
    expect(empty.stroke).not.toBe('none')
  })
})
