import { describe, it, expect, beforeEach, vi } from 'vitest'

const mem = {}
vi.stubGlobal('localStorage', {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v) },
  removeItem: (k) => { delete mem[k] },
})

const { useResumeStore, readLocalResume } = await import('./useResumeStore')

beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k]
  useResumeStore.getState().reset()
  vi.useFakeTimers()
  vi.setSystemTime(1000)
})

describe('useResumeStore', () => {
  it('record stamps the time, sets last and writes rc-resume immediately', () => {
    useResumeStore.getState().record('room', { x: 10, y: 20, facing: 'left', label: 'ที่โต๊ะ' })
    const s = useResumeStore.getState()
    expect(s.last).toBe('room')
    expect(s.points.room).toEqual({ x: 10, y: 20, facing: 'left', label: 'ที่โต๊ะ', at: 1000 })
    expect(JSON.parse(mem['rc-resume']).points.room.x).toBe(10)
  })

  it('a later record on another map moves last', () => {
    useResumeStore.getState().record('room', { x: 1, y: 1, facing: 'down', label: 'a' })
    vi.setSystemTime(2000)
    useResumeStore.getState().record('campus', { x: 2, y: 2, facing: 'down', label: 'b' })
    expect(useResumeStore.getState().last).toBe('campus')
  })

  it('ignores a point with non-finite coordinates', () => {
    useResumeStore.getState().record('room', { x: NaN, y: 1, facing: 'down', label: '' })
    expect(useResumeStore.getState().last).toBeNull()
  })

  it('hydrate merges the cloud copy: newer local point survives', () => {
    useResumeStore.getState().record('room', { x: 5, y: 5, facing: 'down', label: 'local' })
    useResumeStore.getState().hydrate({ last: 'room', points: { room: { x: 9, y: 9, facing: 'up', label: 'old', at: 10 }, campus: { x: 3, y: 3, facing: 'up', label: 'c', at: 500 } } })
    const s = useResumeStore.getState()
    expect(s.points.room.label).toBe('local')
    expect(s.points.campus.x).toBe(3)
    expect(s.last).toBe('room')
  })

  it('forget drops a map that cannot be loaded and moves last to the newest remaining one', () => {
    useResumeStore.getState().record('room', { x: 1, y: 1, facing: 'down', label: 'a' })
    vi.setSystemTime(2000)
    useResumeStore.getState().record('campus', { x: 2, y: 2, facing: 'down', label: 'b' })
    useResumeStore.getState().forget('campus')
    expect(useResumeStore.getState().points.campus).toBeUndefined()
    expect(useResumeStore.getState().last).toBe('room')
    useResumeStore.getState().forget('room')
    expect(useResumeStore.getState().last).toBeNull()
  })

  it('readLocalResume repairs corrupt storage', () => {
    mem['rc-resume'] = 'nope'
    expect(readLocalResume()).toEqual({ last: null, points: {} })
    mem['rc-resume'] = '{"last":"x","points":{"x":{"x":"a"}}}'
    expect(readLocalResume()).toEqual({ last: null, points: {} })
  })
})
