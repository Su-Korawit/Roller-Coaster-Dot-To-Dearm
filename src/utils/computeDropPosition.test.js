import { describe, it, expect, vi } from 'vitest'
import { computeDropPosition } from './computeDropPosition'

describe('computeDropPosition', () => {
  it('centres a process block (128x128) on the flow point the screen point maps to', () => {
    const screenToFlowPosition = vi.fn(({ x, y }) => ({ x: x + 10, y: y + 10 }))
    const result = computeDropPosition({ clientX: 190, clientY: 190 }, screenToFlowPosition, 'process')
    expect(screenToFlowPosition).toHaveBeenCalledWith({ x: 190, y: 190 })
    // flow point becomes (200,200); process is 128x128 -> top-left (136,136)
    expect(result).toEqual({ x: 136, y: 136 })
  })

  it('centres a stageLabel block (120x40) using its own size', () => {
    const screenToFlowPosition = ({ x, y }) => ({ x, y })
    const result = computeDropPosition({ clientX: 60, clientY: 60 }, screenToFlowPosition, 'stageLabel')
    expect(result).toEqual({ x: 0, y: 40 })
  })
})
