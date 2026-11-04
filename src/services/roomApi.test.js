import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ call: vi.fn() }))
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_f, name) => (data) => m.call(name, data),
}))

const api = await import('./roomApi')
const focus = await import('./focus')

beforeEach(() => {
  vi.clearAllMocks()
  m.call.mockResolvedValue({ data: { ok: true } })
})

describe('roomApi', () => {
  it('buys by item id', async () => {
    await api.buyRoomItem('lamp_desk')
    expect(m.call).toHaveBeenCalledWith('buyRoomItem', { itemId: 'lamp_desk' })
  })

  it('claims the welcome pack with no arguments', async () => {
    await api.claimWelcomePack()
    expect(m.call).toHaveBeenCalledWith('claimWelcomePack', undefined)
  })

  it('saves a layout', async () => {
    const layout = { tier: 0, theme: 'minimal', petId: null, placed: [] }
    await api.saveRoomLayout(layout)
    expect(m.call).toHaveBeenCalledWith('saveRoomLayout', { layout })
  })

  it('returns the callable data', async () => {
    m.call.mockResolvedValue({ data: { ok: true, leaves: 10, owned: 1 } })
    expect(await api.buyRoomItem('x')).toEqual({ ok: true, leaves: 10, owned: 1 })
  })
})

describe('services/focus', () => {
  it('sends the chosen mode and planned minutes when starting', async () => {
    await focus.startFocus({ mode: 'strict', plannedMin: 50 })
    expect(m.call).toHaveBeenCalledWith('startFocus', { mode: 'strict', plannedMin: 50 })
  })

  it('still starts with no arguments (server defaults)', async () => {
    await focus.startFocus()
    expect(m.call).toHaveBeenCalledWith('startFocus', {})
  })

  it('can abandon a session', async () => {
    await focus.abandonFocus()
    expect(m.call).toHaveBeenCalledWith('abandonFocus', undefined)
  })
})
