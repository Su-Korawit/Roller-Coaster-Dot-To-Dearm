// ============================================================================
// schoolRoom.js — which presence room a student joins (ADR 0018).
// A room is an RTDB (ownerUid, mapKey) pair, so a School Server is just a
// reserved ownerUid on the shared `school_hub` map:
//   school:{schoolId}:{shard}   — own school, once it has enough members
//   commons:{shard}             — everyone else (empty rooms feel dead)
// `:` cannot appear in a Google place_id, so database.rules.json can match
// `school:{id}:` as an unambiguous prefix. The 50-player cap is SOFT: two
// clients can race past it; the rules cannot count children.
// ============================================================================
import { countPlayers } from './presence'

export const SCHOOL_HUB_MAP_KEY = 'school_hub'
export const SCHOOL_ROOM_MIN_MEMBERS = 30
export const ROOM_CAP = 50
export const MAX_SHARDS = 20

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/

// Pure: pick the room family (not yet the shard).
export function resolveRoomBase({ schoolId, memberCount }) {
  if (typeof schoolId === 'string' && SAFE_ID.test(schoolId) && Number(memberCount) >= SCHOOL_ROOM_MIN_MEMBERS) {
    return { kind: 'school', base: `school:${schoolId}` }
  }
  return { kind: 'commons', base: 'commons' }
}

export const shardOwnerUid = (base, shard) => `${base}:${shard}`

// Pure: counts[i] is the head-count of shard i+1. Returns the first shard with
// room, or null when every shard is full.
export function pickShard(counts, cap = ROOM_CAP) {
  const i = counts.findIndex((c) => c < cap)
  return i === -1 ? null : i + 1
}

// Reads head-counts shard by shard (stops at the first with room) and returns
// where to join. `countFn(ownerUid, mapKey, selfUid) -> { total, hasSelf }`.
export async function chooseRoom({
  schoolId, memberCount, selfUid, countFn = countPlayers, cap = ROOM_CAP, maxShards = MAX_SHARDS,
}) {
  const { kind, base } = resolveRoomBase({ schoolId, memberCount })
  for (let shard = 1; shard <= maxShards; shard++) {
    const ownerUid = shardOwnerUid(base, shard)
    const { total, hasSelf } = await countFn(ownerUid, SCHOOL_HUB_MAP_KEY, selfUid)
    // Re-joining a room we are already in never counts against the cap.
    if (hasSelf || total < cap) {
      return { kind, ownerUid, mapKey: SCHOOL_HUB_MAP_KEY, shard, full: false }
    }
  }
  return { kind, ownerUid: null, mapKey: SCHOOL_HUB_MAP_KEY, shard: null, full: true }
}
