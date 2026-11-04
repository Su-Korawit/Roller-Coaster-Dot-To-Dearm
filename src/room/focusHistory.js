// Finished focus sessions as the history sheet and the trophy shelf show them. `focusSessions` is
// written only by the focus functions and each document carries the owner's uid, which is dropped here:
// nothing about the account leaves this module.
export const HISTORY_LIMIT = 50

const num = (v) => (Number.isFinite(v) ? v : 0)

export function shapeSession(id, d) {
  const data = d && typeof d === 'object' ? d : {}
  const endedAt = typeof data.endedAt?.toMillis === 'function' ? data.endedAt.toMillis() : num(data.endedAt)
  const withered = data.withered === true
  return {
    id,
    tree: withered ? 'withered' : typeof data.tree === 'string' ? data.tree : 'sprout',
    mode: data.mode === 'strict' ? 'strict' : 'flexible',
    minutes: Math.floor(num(data.verifiedMs) / 60000),
    leaves: num(data.leaves),
    withered,
    practice: data.practice === true,
    endedAt,
    subjectKey: typeof data.subjectKey === 'string' ? data.subjectKey : null,
  }
}

// Newest first (the sort is stable, so equal times keep their order).
export const sortSessions = (list) => [...list].sort((a, b) => b.endedAt - a.endedAt)

// Marker colours on the trophy shelf (all in the Soft Pixel palette).
export const SHELF_COLORS = { sprout: '#B6DCA0', shrub: '#7BC48C', tree: '#3F7A4A', blossom: '#E58BC0', withered: '#CDB896' }

// What the trophy shelf shows: the last three real sessions as small coloured trees, top shelf first.
export const shelfTrophies = (list) => recentTrees(list, 3).map((s, shelf) => ({ shelf, tree: s.tree, color: SHELF_COLORS[s.tree] ?? SHELF_COLORS.sprout }))

// The trees on the shelf: the latest real sessions (a practice run is not a trophy).
export const recentTrees = (list, n) => sortSessions((Array.isArray(list) ? list : []).filter((s) => !s.practice)).slice(0, n)

// A stored session that really ended with a tree. Stale sessions that startFocus closes as
// `lapsed` carry no tree and no outcome: they are neither trophies nor shareable cards.
export const isTreeSession = (d) => !!d && typeof d === 'object' && d.reason !== 'lapsed' && typeof d.tree === 'string'
