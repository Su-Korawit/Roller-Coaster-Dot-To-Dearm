import { describe, it, expect, vi } from 'vitest'

vi.mock('../firebase', () => ({ rtdb: {} }))
vi.mock('firebase/database', () => ({
  ref: vi.fn(), set: vi.fn(), remove: vi.fn(), onValue: vi.fn(), onDisconnect: vi.fn(), get: vi.fn(),
}))

const { resolveRoomBase, pickShard, chooseRoom, shardOwnerUid, SCHOOL_ROOM_MIN_MEMBERS, ROOM_CAP, SCHOOL_HUB_MAP_KEY } =
  await import('./schoolRoom')

describe('resolveRoomBase', () => {
  it('uses the school room once the school reaches the member threshold', () => {
    expect(resolveRoomBase({ schoolId: 'ChIJabc_-1', memberCount: SCHOOL_ROOM_MIN_MEMBERS }))
      .toEqual({ kind: 'school', base: 'school:ChIJabc_-1' })
  })
  it('falls back to commons below the threshold', () => {
    expect(resolveRoomBase({ schoolId: 'ChIJabc', memberCount: SCHOOL_ROOM_MIN_MEMBERS - 1 }).kind).toBe('commons')
  })
  it('falls back to commons without a schoolId or a count', () => {
    expect(resolveRoomBase({ schoolId: null, memberCount: 999 }).kind).toBe('commons')
    expect(resolveRoomBase({ schoolId: 'ChIJabc', memberCount: undefined }).kind).toBe('commons')
  })
  it('refuses ids that could escape the RTDB key (":" "/" ".")', () => {
    for (const bad of ['a:b', 'a/b', 'a.b', 'a$b', '', 'x'.repeat(200)]) {
      expect(resolveRoomBase({ schoolId: bad, memberCount: 999 }).kind).toBe('commons')
    }
  })
})

describe('pickShard', () => {
  it('returns the first shard under the cap (1-based)', () => {
    expect(pickShard([50, 50, 12])).toBe(3)
    expect(pickShard([49])).toBe(1)
  })
  it('returns null when every shard is full', () => {
    expect(pickShard([50, 50])).toBeNull()
  })
})

describe('chooseRoom', () => {
  const counts = (map) => vi.fn(async (ownerUid) => map[ownerUid] ?? { total: 0, hasSelf: false })

  it('joins shard 1 of the school room when it has space', async () => {
    const r = await chooseRoom({ schoolId: 'S1', memberCount: 40, countFn: counts({}) })
    expect(r).toEqual({ kind: 'school', ownerUid: 'school:S1:1', mapKey: SCHOOL_HUB_MAP_KEY, shard: 1, full: false })
  })

  it('spills into shard 2 when shard 1 is full, without counting past the first open shard', async () => {
    const countFn = counts({ 'school:S1:1': { total: ROOM_CAP, hasSelf: false } })
    const r = await chooseRoom({ schoolId: 'S1', memberCount: 40, countFn })
    expect(r.shard).toBe(2)
    expect(countFn).toHaveBeenCalledTimes(2)
  })

  it('re-joins a full shard we are already in', async () => {
    const countFn = counts({ 'school:S1:1': { total: ROOM_CAP, hasSelf: true } })
    expect((await chooseRoom({ schoolId: 'S1', memberCount: 40, countFn })).shard).toBe(1)
  })

  it('routes small schools to commons', async () => {
    const r = await chooseRoom({ schoolId: 'S1', memberCount: 3, countFn: counts({}) })
    expect(r.ownerUid).toBe(shardOwnerUid('commons', 1))
  })

  it('reports full when every shard is at cap', async () => {
    const countFn = vi.fn(async () => ({ total: ROOM_CAP, hasSelf: false }))
    const r = await chooseRoom({ schoolId: 'S1', memberCount: 40, countFn, maxShards: 3 })
    expect(r).toMatchObject({ full: true, ownerUid: null })
    expect(countFn).toHaveBeenCalledTimes(3)
  })
})
