import { describe, it, expect } from 'vitest'
import { shapeSession, sortSessions, recentTrees, shelfTrophies, SHELF_COLORS, HISTORY_LIMIT, isTreeSession } from './focusHistory'

const raw = (over = {}) => ({ uid: 'u1', startedAt: 1000, endedAt: 5000, verifiedMs: 25 * 60000, mode: 'strict', plannedMin: 25, tree: 'shrub', leaves: 41, withered: false, practice: false, subjectKey: 'a_lv_64', reason: 'ended', ...over })

describe('shapeSession', () => {
  it('keeps what the history shows and nothing about the account', () => {
    expect(shapeSession('s1', raw())).toEqual({
      id: 's1', tree: 'shrub', mode: 'strict', minutes: 25, leaves: 41, withered: false, practice: false, endedAt: 5000, subjectKey: 'a_lv_64',
    })
  })
  it('floors minutes, defaults missing fields and survives junk', () => {
    expect(shapeSession('s2', raw({ verifiedMs: 90 * 1000 })).minutes).toBe(1)
    const d = shapeSession('s3', {})
    expect(d).toMatchObject({ id: 's3', tree: 'sprout', mode: 'flexible', minutes: 0, leaves: 0, withered: false, practice: false, endedAt: 0, subjectKey: null })
    expect(shapeSession('s4', null)).toMatchObject({ id: 's4', minutes: 0 })
  })
  it('a withered session shows the withered tree whatever species it had', () => {
    expect(shapeSession('s5', raw({ withered: true, tree: 'tree' })).tree).toBe('withered')
  })
  it('accepts a Firestore timestamp for endedAt', () => {
    expect(shapeSession('s6', raw({ endedAt: { toMillis: () => 777 } })).endedAt).toBe(777)
  })
})

describe('sortSessions', () => {
  it('newest first, stable for equal times, and does not mutate', () => {
    const list = [{ id: 'a', endedAt: 1 }, { id: 'b', endedAt: 3 }, { id: 'c', endedAt: 3 }, { id: 'd', endedAt: 2 }]
    const copy = [...list]
    expect(sortSessions(list).map((s) => s.id)).toEqual(['b', 'c', 'd', 'a'])
    expect(list).toEqual(copy)
  })
})

describe('recentTrees (the shelf)', () => {
  const s = (id, endedAt, over = {}) => ({ id, endedAt, tree: 'tree', practice: false, ...over })
  it('the last three real sessions, newest first; practice sessions never go on the shelf', () => {
    const list = [s('1', 1), s('2', 2), s('p', 9, { practice: true }), s('3', 3), s('4', 4)]
    expect(recentTrees(list, 3).map((x) => x.id)).toEqual(['4', '3', '2'])
  })
  it('fewer sessions than slots, and none', () => {
    expect(recentTrees([s('1', 1)], 3)).toHaveLength(1)
    expect(recentTrees([], 3)).toEqual([])
    expect(recentTrees(undefined, 3)).toEqual([])
  })
})

describe('shelfTrophies', () => {
  it('one coloured marker per recent tree, top shelf first, at most three', () => {
    const list = [1, 2, 3, 4].map((n) => ({ id: String(n), endedAt: n, tree: n % 2 ? 'blossom' : 'shrub', practice: false }))
    const t = shelfTrophies(list)
    expect(t).toHaveLength(3)
    expect(t[0]).toEqual({ shelf: 0, tree: 'shrub', color: SHELF_COLORS.shrub })
    expect(t.map((x) => x.shelf)).toEqual([0, 1, 2])
  })
  it('knows a colour for every tree and falls back for an unknown one', () => {
    for (const k of ['sprout', 'shrub', 'tree', 'blossom', 'withered']) expect(SHELF_COLORS[k], k).toMatch(/^#[0-9A-F]{6}$/)
    expect(shelfTrophies([{ id: 'x', endedAt: 1, tree: 'palm', practice: false }])[0].color).toBe(SHELF_COLORS.sprout)
  })
  it('an empty history leaves the shelf empty', () => {
    expect(shelfTrophies([])).toEqual([])
  })
})

describe('HISTORY_LIMIT', () => {
  it('is 50', () => expect(HISTORY_LIMIT).toBe(50))
})

describe('isTreeSession (review I3: a lapsed session is not a tree)', () => {
  it('counts sessions that ended with a tree', () => {
    expect(isTreeSession(raw())).toBe(true)
    expect(isTreeSession(raw({ withered: true }))).toBe(true)
  })
  it('skips stale sessions closed as lapsed, and documents without a tree', () => {
    expect(isTreeSession(raw({ reason: 'lapsed' }))).toBe(false)
    const { tree, ...noTree } = raw()
    expect(tree).toBe('shrub')
    expect(isTreeSession(noTree)).toBe(false)
    expect(isTreeSession(null)).toBe(false)
  })
})
