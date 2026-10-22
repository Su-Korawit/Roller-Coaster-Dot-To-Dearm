import { describe, it, expect } from 'vitest'
import { useSchoolWorldStore } from './useSchoolWorldStore'

describe('requestMapChange', () => {
  it('carries the resume point and counts requests so repeats are seen', () => {
    useSchoolWorldStore.getState().requestMapChange('room', { spawnAt: { x: 4, y: 5 } })
    const first = useSchoolWorldStore.getState().mapChangeRequest
    expect(first).toMatchObject({ mapKey: 'room', spawnAt: { x: 4, y: 5 } })
    useSchoolWorldStore.getState().requestMapChange('room')
    const second = useSchoolWorldStore.getState().mapChangeRequest
    expect(second.spawnAt).toBeNull()
    expect(second.n).toBe(first.n + 1)
    useSchoolWorldStore.getState().clearMapChangeRequest()
  })
})
