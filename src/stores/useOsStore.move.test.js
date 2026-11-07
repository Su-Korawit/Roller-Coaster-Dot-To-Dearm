import { describe, it, expect, beforeEach } from 'vitest'
import { useOsStore } from './useOsStore'

beforeEach(() => useOsStore.setState({ installed: ['goal', 'habit', 'reading', 'community'] }))

describe('moveApp (drag on Home)', () => {
  it('reorders installed apps', () => {
    useOsStore.getState().moveApp('community', 'goal')
    expect(useOsStore.getState().installed).toEqual(['community', 'goal', 'habit', 'reading'])
  })
  it('never moves or displaces built-ins, and ignores unknown ids', () => {
    const before = useOsStore.getState().installed
    useOsStore.getState().moveApp('store', 'goal')
    useOsStore.getState().moveApp('goal', 'store')
    useOsStore.getState().moveApp('nope', 'goal')
    expect(useOsStore.getState().installed).toBe(before)
  })
})
