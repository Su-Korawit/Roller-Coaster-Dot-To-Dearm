import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDoc = vi.fn()
vi.mock('firebase/firestore', () => ({ getDoc: (...a) => getDoc(...a) }))
vi.mock('../lib/db', () => ({
  refs: { user: (u) => `user:${u}`, school: (s) => `school:${s}` },
}))
const chooseRoom = vi.fn()
vi.mock('../lib/schoolRoom', () => ({
  SCHOOL_HUB_MAP_KEY: 'school_hub',
  chooseRoom: (...a) => chooseRoom(...a),
}))
vi.mock('../stores/useFarmStore', () => ({ useFarmStore: { setState: vi.fn() } }))
const returnHome = vi.fn()
vi.mock('../lib/syncManager', () => ({ returnHome: (...a) => returnHome(...a) }))
const playSound = vi.fn()
vi.mock('../lib/sfx', () => ({ playSound: (...a) => playSound(...a) }))
const focusApi = { startFocus: vi.fn(), checkInFocus: vi.fn(), endFocus: vi.fn() }
vi.mock('./focus', () => focusApi)

const { useWorldStore } = await import('../stores/useWorldStore')
const { useSchoolWorldStore } = await import('../stores/useSchoolWorldStore')
const { useUserStore } = await import('../stores/useUserStore')
const { useFxStore } = await import('../stores/useFxStore')
const { enterSchoolHub, leaveSchoolHub, beginFocus, confirmFocus, finishFocus } = await import('./schoolWorld')

const snap = (data) => ({ exists: () => data != null, data: () => data })

beforeEach(() => {
  getDoc.mockReset(); chooseRoom.mockReset(); returnHome.mockReset()
  Object.values(focusApi).forEach((f) => f.mockReset())
  playSound.mockReset()
  useFxStore.getState().clear()
  useUserStore.setState({ focusXp: 0 })
  useSchoolWorldStore.setState({ inHub: false, room: null, enterStatus: 'idle', enterError: null, mapChangeRequest: null })
  useSchoolWorldStore.getState().resetFocus()
  useWorldStore.setState({ currentMapOwnerUid: 'me', currentMapKey: 'test3' })
})

describe('enterSchoolHub', () => {
  const stubDocs = (user, school) => getDoc.mockImplementation(async (ref) =>
    ref === 'user:me' ? snap(user) : snap(school))

  it('refuses users with no school and changes nothing', async () => {
    stubDocs({ schoolId: null }, null)
    expect(await enterSchoolHub('me')).toEqual({ ok: false, error: 'NO_SCHOOL' })
    expect(useSchoolWorldStore.getState().enterError).toBe('NO_SCHOOL')
    expect(useWorldStore.getState().currentMapOwnerUid).toBe('me')
    expect(chooseRoom).not.toHaveBeenCalled()
  })

  it('resolves the room from schoolId + memberCount, flips owner and map key together, requests the map', async () => {
    stubDocs({ schoolId: 'S1' }, { memberCount: 42 })
    chooseRoom.mockResolvedValue({ kind: 'school', ownerUid: 'school:S1:1', mapKey: 'school_hub', shard: 1, full: false })

    const r = await enterSchoolHub('me')

    expect(chooseRoom).toHaveBeenCalledWith({ schoolId: 'S1', memberCount: 42, selfUid: 'me' })
    expect(r.ok).toBe(true)
    expect(useWorldStore.getState()).toMatchObject({ currentMapOwnerUid: 'school:S1:1', currentMapKey: 'school_hub' })
    const s = useSchoolWorldStore.getState()
    expect(s.inHub).toBe(true)
    expect(s.room).toEqual({ kind: 'school', shard: 1, ownerUid: 'school:S1:1', schoolId: 'S1' })
    expect(s.mapChangeRequest.mapKey).toBe('school_hub')
  })

  it('treats a missing school doc as 0 members (-> commons via chooseRoom)', async () => {
    stubDocs({ schoolId: 'S1' }, null)
    chooseRoom.mockResolvedValue({ kind: 'commons', ownerUid: 'commons:1', mapKey: 'school_hub', shard: 1, full: false })
    await enterSchoolHub('me')
    expect(chooseRoom).toHaveBeenCalledWith(expect.objectContaining({ memberCount: 0 }))
  })

  it('still enters (via commons) when the school directory cannot be read', async () => {
    getDoc.mockImplementation(async (ref) => {
      if (ref === 'user:me') return snap({ schoolId: 'S1' })
      throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' })
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    chooseRoom.mockResolvedValue({ kind: 'commons', ownerUid: 'commons:1', mapKey: 'school_hub', shard: 1, full: false })
    const r = await enterSchoolHub('me')
    expect(r.ok).toBe(true)
    expect(chooseRoom).toHaveBeenCalledWith(expect.objectContaining({ memberCount: 0 }))
    expect(useWorldStore.getState().currentMapOwnerUid).toBe('commons:1')
  })

  it('reports ROOM_FULL and leaves the world untouched', async () => {
    stubDocs({ schoolId: 'S1' }, { memberCount: 42 })
    chooseRoom.mockResolvedValue({ kind: 'school', ownerUid: null, full: true })
    expect(await enterSchoolHub('me')).toEqual({ ok: false, error: 'ROOM_FULL' })
    expect(useWorldStore.getState().currentMapOwnerUid).toBe('me')
    expect(useSchoolWorldStore.getState().inHub).toBe(false)
  })

  it('maps unexpected failures to FAILED instead of throwing', async () => {
    getDoc.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await enterSchoolHub('me')).toEqual({ ok: false, error: 'FAILED' })
  })
})

describe('leaveSchoolHub', () => {
  it('clears hub state, returns the user home on the entry map and asks the game to load it', async () => {
    useSchoolWorldStore.setState({ inHub: true, room: { ownerUid: 'x' }, entryMapKey: 'farm_entry' })
    await leaveSchoolHub('me')
    const s = useSchoolWorldStore.getState()
    expect(s.inHub).toBe(false)
    expect(s.mapChangeRequest.mapKey).toBe('farm_entry')
    expect(returnHome).toHaveBeenCalledWith('me', 'farm_entry')
  })

  it('falls back to test3 when the entry map is not known yet', async () => {
    useSchoolWorldStore.setState({ inHub: true, entryMapKey: null })
    await leaveSchoolHub('me')
    expect(returnHome).toHaveBeenCalledWith('me', 'test3')
    expect(useSchoolWorldStore.getState().mapChangeRequest.mapKey).toBe('test3')
  })
})

describe('focus actions mirror the server answer', () => {
  it('begin -> check-in -> end accumulates XP and tracks lastCheckInAt', async () => {
    focusApi.startFocus.mockResolvedValue({ ok: true, resumed: false, startedAt: 100, lastCheckInAt: 100, verifiedMs: 0 })
    await beginFocus()
    expect(useSchoolWorldStore.getState().focus).toMatchObject({ status: 'active', startedAt: 100, lastCheckInAt: 100 })

    focusApi.checkInFocus.mockResolvedValue({ verifiedMs: 25 * 60000, lastCheckInAt: 999, xpGained: 25 })
    await confirmFocus()
    expect(useSchoolWorldStore.getState().focus).toMatchObject({ lastCheckInAt: 999, verifiedMs: 25 * 60000, xpThisSession: 25 })

    focusApi.endFocus.mockResolvedValue({ verifiedMs: 30 * 60000, xpGained: 5 })
    await finishFocus()
    expect(useSchoolWorldStore.getState().focus).toMatchObject({ status: 'idle', xpThisSession: 30, verifiedMs: 30 * 60000 })
  })

  it('resuming keeps the session XP; a fresh start resets it', async () => {
    useSchoolWorldStore.getState().setFocus({ xpThisSession: 12 })
    focusApi.startFocus.mockResolvedValue({ resumed: true, startedAt: 1, lastCheckInAt: 2, verifiedMs: 5 })
    await beginFocus()
    expect(useSchoolWorldStore.getState().focus.xpThisSession).toBe(12)
    focusApi.startFocus.mockResolvedValue({ resumed: false, startedAt: 9, lastCheckInAt: 9, verifiedMs: 0 })
    await beginFocus()
    expect(useSchoolWorldStore.getState().focus.xpThisSession).toBe(0)
  })

  it('surfaces a server error and clears busy; a second call while busy is ignored', async () => {
    focusApi.checkInFocus.mockRejectedValue(new Error('NO_ACTIVE_SESSION'))
    await confirmFocus()
    expect(useSchoolWorldStore.getState().focus).toMatchObject({ error: 'NO_ACTIVE_SESSION', busy: false })

    let release
    focusApi.startFocus.mockReturnValue(new Promise((r) => { release = r }))
    const first = beginFocus()
    expect(await beginFocus()).toBeNull()                 // busy: ignored
    expect(focusApi.startFocus).toHaveBeenCalledTimes(1)
    release({ startedAt: 1, lastCheckInAt: 1, verifiedMs: 0 })
    await first
  })
})

describe('Focus feedback (sound + toasts + HUD XP)', () => {
  it('starting a fresh session chimes; resuming one does not', async () => {
    focusApi.startFocus.mockResolvedValue({ resumed: false, startedAt: 1, lastCheckInAt: 1, verifiedMs: 0 })
    await beginFocus()
    expect(playSound).toHaveBeenCalledWith('success')
    playSound.mockReset()
    focusApi.startFocus.mockResolvedValue({ resumed: true, startedAt: 1, lastCheckInAt: 2, verifiedMs: 5 })
    await beginFocus()
    expect(playSound).not.toHaveBeenCalled()
  })

  it('a check-in adds the XP to the HUD total and celebrates it', async () => {
    focusApi.checkInFocus.mockResolvedValue({ verifiedMs: 1, lastCheckInAt: 9, xpGained: 25 })
    await confirmFocus()
    expect(useUserStore.getState().focusXp).toBe(25)
    expect(playSound).toHaveBeenCalledWith('coin')
    expect(useFxStore.getState().toasts[0]).toMatchObject({ kind: 'xp', text: '+25 XP' })
  })

  it('crossing a level boundary while checking in / ending triggers LEVEL UP', async () => {
    useUserStore.setState({ focusXp: 55 })      // level 1; 60 XP is level 2
    focusApi.checkInFocus.mockResolvedValue({ verifiedMs: 1, lastCheckInAt: 9, xpGained: 10 })
    await confirmFocus()
    expect(playSound).toHaveBeenCalledWith('levelup')
    expect(useFxStore.getState().toasts[0].text).toBe('LEVEL UP! Lv 2')

    useFxStore.getState().clear()
    useUserStore.setState({ focusXp: 175 })     // level 2; 180 XP is level 3
    focusApi.endFocus.mockResolvedValue({ verifiedMs: 1, xpGained: 6 })
    await finishFocus()
    expect(useFxStore.getState().toasts[0].text).toBe('LEVEL UP! Lv 3')
  })

  it('zero XP stays silent; a server error buzzes', async () => {
    focusApi.checkInFocus.mockResolvedValue({ verifiedMs: 1, lastCheckInAt: 9, xpGained: 0 })
    await confirmFocus()
    expect(playSound).not.toHaveBeenCalled()
    expect(useFxStore.getState().toasts).toHaveLength(0)

    focusApi.checkInFocus.mockRejectedValue(new Error('NO_ACTIVE_SESSION'))
    await confirmFocus()
    expect(playSound).toHaveBeenCalledWith('error')
  })

  it('entering the school plays the door blip', async () => {
    getDoc.mockImplementation(async (ref) => (ref === 'user:me' ? snap({ schoolId: 'S1' }) : snap({ memberCount: 40 })))
    chooseRoom.mockResolvedValue({ kind: 'school', ownerUid: 'school:S1:1', mapKey: 'school_hub', shard: 1, full: false })
    await enterSchoolHub('me')
    expect(playSound).toHaveBeenCalledWith('open')
  })
})
