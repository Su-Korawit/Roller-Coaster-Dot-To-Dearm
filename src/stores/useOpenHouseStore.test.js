import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ fetchIndex: vi.fn(), fetchBuilding: vi.fn() }))
vi.mock('../services/openHouseClient', () => ({
  fetchIndex: (...a) => m.fetchIndex(...a),
  fetchBuilding: (...a) => m.fetchBuilding(...a),
}))

const { useOpenHouseStore } = await import('./useOpenHouseStore')

const building = (n) => ({ tcasYear: 2570, updatedAt: 'x', universities: [{ id: `u${n}`, nameTh: `มหาวิทยาลัย ${n}`, programs: [] }] })
const deferred = () => {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  useOpenHouseStore.getState().reset()
})

describe('useOpenHouseStore.loadBuilding', () => {
  it('goes loading → ready and keeps the data', async () => {
    m.fetchBuilding.mockResolvedValue({ ok: true, data: building(1) })
    const p = useOpenHouseStore.getState().loadBuilding('med')
    expect(useOpenHouseStore.getState().buildings.med.status).toBe('loading')
    await p
    expect(useOpenHouseStore.getState().buildings.med).toMatchObject({ status: 'ready', data: building(1) })
  })

  it('caches a ready building for the session (no second request)', async () => {
    m.fetchBuilding.mockResolvedValue({ ok: true, data: building(1) })
    await useOpenHouseStore.getState().loadBuilding('med')
    await useOpenHouseStore.getState().loadBuilding('med')
    expect(m.fetchBuilding).toHaveBeenCalledTimes(1)
  })

  it('records the reason when loading fails and retry asks again', async () => {
    m.fetchBuilding.mockResolvedValueOnce({ ok: false, error: 'missing' })
    await useOpenHouseStore.getState().loadBuilding('med')
    expect(useOpenHouseStore.getState().buildings.med).toMatchObject({ status: 'error', error: 'missing' })
    m.fetchBuilding.mockResolvedValueOnce({ ok: true, data: building(1) })
    await useOpenHouseStore.getState().retry('med')
    expect(useOpenHouseStore.getState().buildings.med.status).toBe('ready')
    expect(m.fetchBuilding).toHaveBeenCalledTimes(2)
  })

  it('does not start a second request while one is in flight for the same building', async () => {
    const d = deferred()
    m.fetchBuilding.mockReturnValue(d.promise)
    const a = useOpenHouseStore.getState().loadBuilding('med')
    const b = useOpenHouseStore.getState().loadBuilding('med')
    d.resolve({ ok: true, data: building(1) })
    await Promise.all([a, b])
    expect(m.fetchBuilding).toHaveBeenCalledTimes(1)
  })

  it('answers that arrive out of order never overwrite the building they belong to', async () => {
    const slow = deferred()
    const fast = deferred()
    m.fetchBuilding.mockImplementation((id) => (id === 'med' ? slow.promise : fast.promise))
    const med = useOpenHouseStore.getState().loadBuilding('med')
    const eng = useOpenHouseStore.getState().loadBuilding('eng')
    fast.resolve({ ok: true, data: building(2) })
    await eng
    slow.resolve({ ok: true, data: building(1) })
    await med
    expect(useOpenHouseStore.getState().buildings.eng.data).toEqual(building(2))
    expect(useOpenHouseStore.getState().buildings.med.data).toEqual(building(1))
  })

  it('a retry that races an older failed request wins', async () => {
    const first = deferred()
    m.fetchBuilding.mockReturnValueOnce(first.promise)
    const a = useOpenHouseStore.getState().loadBuilding('med')
    m.fetchBuilding.mockResolvedValueOnce({ ok: true, data: building(1) })
    const b = useOpenHouseStore.getState().retry('med')
    await b
    first.resolve({ ok: false, error: 'network' })
    await a
    expect(useOpenHouseStore.getState().buildings.med).toMatchObject({ status: 'ready', data: building(1) })
  })
})

describe('useOpenHouseStore.loadIndex', () => {
  it('loads the index once', async () => {
    m.fetchIndex.mockResolvedValue({ ok: true, data: { tcasYear: 2570, updatedAt: 'x', buildings: {} } })
    await useOpenHouseStore.getState().loadIndex()
    await useOpenHouseStore.getState().loadIndex()
    expect(m.fetchIndex).toHaveBeenCalledTimes(1)
    expect(useOpenHouseStore.getState().index).toMatchObject({ status: 'ready' })
  })

  it('a failed index is not fatal: status error, can be tried again', async () => {
    m.fetchIndex.mockResolvedValueOnce({ ok: false, error: 'network' })
    await useOpenHouseStore.getState().loadIndex()
    expect(useOpenHouseStore.getState().index).toMatchObject({ status: 'error', error: 'network' })
    m.fetchIndex.mockResolvedValueOnce({ ok: true, data: { tcasYear: 2570, updatedAt: 'x', buildings: {} } })
    await useOpenHouseStore.getState().loadIndex()
    expect(useOpenHouseStore.getState().index.status).toBe('ready')
  })
})
