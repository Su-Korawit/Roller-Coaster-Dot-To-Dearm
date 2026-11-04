import { describe, it, expect, beforeEach, vi } from 'vitest'

const mem = {}
vi.stubGlobal('localStorage', {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v) },
  removeItem: (k) => { delete mem[k] },
})

const { useGuideStore, readLocalGuide, isGuideActive } = await import('./useGuideStore')
const { sanitizeGuide } = await import('../lib/guideRules')
const { emitGuide } = await import('../lib/guideEvents')
const { GUIDE_STEPS } = await import('../constants/guideSteps')

const ctx = (over = {}) => ({
  signedIn: true, practiceDone: false, hasPurchased: false, canAffordSomething: true,
  hasUnplacedItem: true, hasCustomRoom: false, places: 2, ...over,
})
const provide = (c) => useGuideStore.getState().setContextProvider(() => c)

beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k]
  useGuideStore.getState().reset()
  provide(ctx())
})

describe('useGuideStore', () => {
  it('starts on the first available step', () => {
    useGuideStore.getState().start()
    expect(useGuideStore.getState()).toMatchObject({ started: true, step: 0, done: false })
    expect(useGuideStore.getState().current().id).toBe('practice')
  })

  it('only the matching event advances; others are ignored', () => {
    useGuideStore.getState().start()
    emitGuide('bought')
    expect(useGuideStore.getState().step).toBe(0)
    emitGuide('practiced')
    expect(useGuideStore.getState().current().id).toBe('buy')
  })

  it('jumps over steps that are not available when advancing', () => {
    useGuideStore.getState().start()
    provide(ctx({ hasPurchased: true, hasUnplacedItem: false }))
    emitGuide('practiced')
    expect(useGuideStore.getState().current().id).toBe('warp')
  })

  it('finishes after the last available step', () => {
    useGuideStore.getState().start()
    emitGuide('practiced'); emitGuide('bought'); emitGuide('placed'); emitGuide('warped')
    expect(useGuideStore.getState()).toMatchObject({ done: true, step: GUIDE_STEPS.length })
    expect(useGuideStore.getState().current()).toBeNull()
  })

  it('a guest with nothing to do is done at once', () => {
    provide(ctx({ signedIn: false, places: 1 }))
    useGuideStore.getState().start()
    expect(useGuideStore.getState().done).toBe(true)
  })

  it('refresh skips a step that became impossible (spent all Leaves elsewhere)', () => {
    useGuideStore.getState().start()
    emitGuide('practiced')
    expect(useGuideStore.getState().current().id).toBe('buy')
    provide(ctx({ canAffordSomething: false, hasUnplacedItem: false }))
    useGuideStore.getState().refresh()
    expect(useGuideStore.getState().current().id).toBe('warp')
  })

  it('skip stops it for good; replay starts over', () => {
    useGuideStore.getState().start()
    useGuideStore.getState().skip()
    expect(isGuideActive(useGuideStore.getState())).toBe(false)
    emitGuide('practiced')
    expect(useGuideStore.getState().step).toBe(0)
    useGuideStore.getState().replay()
    expect(useGuideStore.getState()).toMatchObject({ started: true, skipped: false, done: false, step: 0 })
  })

  it('does nothing before it was started', () => {
    emitGuide('practiced')
    expect(useGuideStore.getState().started).toBe(false)
  })

  it('caches progress for guests in rc-guide', () => {
    useGuideStore.getState().start()
    expect(JSON.parse(mem['rc-guide'])).toMatchObject({ started: true, step: 0 })
  })
})

describe('sanitizeGuide / readLocalGuide', () => {
  it('repairs malformed data', () => {
    expect(sanitizeGuide(undefined)).toEqual({ started: false, step: 0, done: false, skipped: false })
    expect(sanitizeGuide({ started: 'yes', step: -3, done: 1, skipped: null })).toEqual({ started: false, step: 0, done: false, skipped: false })
    expect(sanitizeGuide({ started: true, step: 99, done: true }).step).toBe(GUIDE_STEPS.length)
    mem['rc-guide'] = 'nope'
    expect(readLocalGuide()).toEqual({ started: false, step: 0, done: false, skipped: false })
  })
})
