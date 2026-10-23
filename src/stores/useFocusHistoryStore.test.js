import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ getDocs: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  getDocs: (...a) => m.getDocs(...a),
  query: (...a) => ({ query: a }),
  where: (...a) => ({ where: a }),
  orderBy: (...a) => ({ orderBy: a }),
  limit: (n) => ({ limit: n }),
}))
vi.mock('../lib/db', () => ({ cols: { focusSessions: { path: 'focusSessions' } } }))

const { useFocusHistoryStore } = await import('./useFocusHistoryStore')
const snap = (rows) => ({ docs: rows.map(([id, data]) => ({ id, data: () => data })) })
const row = (id, endedAt, over = {}) => [id, { uid: 'u1', endedAt, verifiedMs: 25 * 60000, tree: 'tree', leaves: 41, mode: 'strict', withered: false, practice: false, ...over }]

beforeEach(() => {
  vi.clearAllMocks()
  useFocusHistoryStore.getState().reset()
})

describe('useFocusHistoryStore', () => {
  it('starts empty and idle', () => {
    expect(useFocusHistoryStore.getState()).toMatchObject({ status: 'idle', sessions: [] })
  })

  it('loads the newest sessions of the signed-in student, newest first, without their uid', async () => {
    m.getDocs.mockResolvedValue(snap([row('a', 100), row('b', 300), row('c', 200)]))
    await useFocusHistoryStore.getState().load('u1')
    const s = useFocusHistoryStore.getState()
    expect(s.status).toBe('ready')
    expect(s.sessions.map((x) => x.id)).toEqual(['b', 'c', 'a'])
    expect(JSON.stringify(s.sessions)).not.toContain('u1')
    const q = m.getDocs.mock.calls[0][0].query
    expect(q.some((p) => p.where?.[0] === 'uid' && p.where[2] === 'u1')).toBe(true)
    expect(q.some((p) => p.limit === 50)).toBe(true)
  })

  it('falls back to an unordered read sorted here when the ordered query is refused (missing index)', async () => {
    m.getDocs.mockRejectedValueOnce(Object.assign(new Error('index'), { code: 'failed-precondition' })).mockResolvedValueOnce(snap([row('a', 1), row('b', 2)]))
    await useFocusHistoryStore.getState().load('u1')
    expect(useFocusHistoryStore.getState().sessions.map((x) => x.id)).toEqual(['b', 'a'])
    expect(m.getDocs).toHaveBeenCalledTimes(2)
  })

  it('an empty history is ready with no sessions, not an error', async () => {
    m.getDocs.mockResolvedValue(snap([]))
    await useFocusHistoryStore.getState().load('u1')
    expect(useFocusHistoryStore.getState()).toMatchObject({ status: 'ready', sessions: [] })
  })

  it('a failed read is an error that can be retried', async () => {
    m.getDocs.mockRejectedValue(Object.assign(new Error('offline'), { code: 'unavailable' }))
    await useFocusHistoryStore.getState().load('u1')
    expect(useFocusHistoryStore.getState().status).toBe('error')
    m.getDocs.mockResolvedValue(snap([row('a', 1)]))
    await useFocusHistoryStore.getState().load('u1')
    expect(useFocusHistoryStore.getState()).toMatchObject({ status: 'ready' })
  })

  it('no uid (a guest) loads nothing and asks nothing', async () => {
    await useFocusHistoryStore.getState().load(null)
    expect(m.getDocs).not.toHaveBeenCalled()
    expect(useFocusHistoryStore.getState().status).toBe('idle')
  })

  it('a late answer for a previous account cannot overwrite the current one', async () => {
    let finish
    m.getDocs.mockReturnValueOnce(new Promise((r) => { finish = r }))
    const first = useFocusHistoryStore.getState().load('u1')
    useFocusHistoryStore.getState().reset()
    m.getDocs.mockResolvedValueOnce(snap([row('mine', 5)]))
    await useFocusHistoryStore.getState().load('u2')
    finish(snap([row('stale', 9)]))
    await first
    expect(useFocusHistoryStore.getState().sessions.map((x) => x.id)).toEqual(['mine'])
  })

  it('adds a just-finished session at the top without another read', () => {
    useFocusHistoryStore.getState().prepend({ id: 'x', endedAt: 999, tree: 'tree', minutes: 30, leaves: 10, mode: 'flexible', withered: false, practice: false, subjectKey: null })
    expect(useFocusHistoryStore.getState().sessions[0].id).toBe('x')
  })

  it('reset clears everything', async () => {
    m.getDocs.mockResolvedValue(snap([row('a', 1)]))
    await useFocusHistoryStore.getState().load('u1')
    useFocusHistoryStore.getState().reset()
    expect(useFocusHistoryStore.getState()).toMatchObject({ status: 'idle', sessions: [] })
  })
})
