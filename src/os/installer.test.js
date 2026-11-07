import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextProgress, useInstallStore, INSTALL_TICK_MS } from './installer'
import { useOsStore } from '../stores/useOsStore'

describe('nextProgress', () => {
  it('rises monotonically and ends at exactly 100', () => {
    let p = 0
    let prev = -1
    let ticks = 0
    while (p < 100 && ticks < 100) { prev = p; p = nextProgress(p); expect(p).toBeGreaterThan(prev); ticks++ }
    expect(p).toBe(100)
    expect(ticks).toBeLessThan(30)
  })
  it('slows down near the end', () => {
    expect(nextProgress(10) - 10).toBeGreaterThan(nextProgress(95) - 95)
  })
})

describe('useInstallStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useOsStore.setState({ installed: [] })
    useInstallStore.setState({ progress: {} })
  })
  afterEach(() => vi.useRealTimers())

  it('does not install until the download reaches 100%', () => {
    useInstallStore.getState().start('link-dekd')
    expect(useInstallStore.getState().progress['link-dekd']).toBe(0)
    vi.advanceTimersByTime(INSTALL_TICK_MS * 3)
    expect(useInstallStore.getState().progress['link-dekd']).toBeGreaterThan(0)
    expect(useOsStore.getState().installed).not.toContain('link-dekd')
    vi.advanceTimersByTime(INSTALL_TICK_MS * 40)
    expect(useOsStore.getState().installed).toContain('link-dekd')
    vi.advanceTimersByTime(1000)
    expect(useInstallStore.getState().progress['link-dekd']).toBeUndefined()
  })

  it('ignores a second start while downloading or when already installed', () => {
    useInstallStore.getState().start('link-dekd')
    vi.advanceTimersByTime(INSTALL_TICK_MS * 2)
    const mid = useInstallStore.getState().progress['link-dekd']
    useInstallStore.getState().start('link-dekd')
    expect(useInstallStore.getState().progress['link-dekd']).toBe(mid)
    useOsStore.setState({ installed: ['x'] })
    useInstallStore.getState().start('x')
    expect(useInstallStore.getState().progress.x).toBeUndefined()
  })
})
