import { describe, it, expect, beforeEach, vi } from 'vitest'

const mem = {}
vi.stubGlobal('localStorage', {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v) },
  removeItem: (k) => { delete mem[k] },
})

const { useHotbarStore } = await import('./useHotbarStore')
const { defaultHotbar } = await import('../lib/hotbarRules')

beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k]
  useHotbarStore.getState().reset()
})

describe('useHotbarStore', () => {
  it('starts with the default bar', () => {
    expect(useHotbarStore.getState().slots).toEqual(defaultHotbar())
  })

  it('swap changes the bar and caches it for guests in rc-hotbar', () => {
    useHotbarStore.getState().swap(0, 4)
    const slots = useHotbarStore.getState().slots
    expect(slots[0]).toBe('letter')
    expect(JSON.parse(mem['rc-hotbar'])).toEqual(slots)
  })

  it('assign puts a bag item on the bar (calendar into slot 0 drops focus)', () => {
    useHotbarStore.getState().assign('mastery', 0)
    expect(useHotbarStore.getState().slots[0]).toBe('mastery')
    expect(useHotbarStore.getState().slots).toContain('warp')
  })

  it('reset returns to the default and clears the cache', () => {
    useHotbarStore.getState().swap(0, 4)
    useHotbarStore.getState().reset()
    expect(useHotbarStore.getState().slots).toEqual(defaultHotbar())
  })

  it('readLocal repairs corrupt storage', async () => {
    const { readLocalHotbar } = await import('./useHotbarStore')
    mem['rc-hotbar'] = 'not json'
    expect(readLocalHotbar()).toEqual(defaultHotbar())
    mem['rc-hotbar'] = '[1,2]'
    expect(readLocalHotbar()).toHaveLength(7)
  })
})
