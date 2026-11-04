// Pure rules for the study room map (ADR-0027). The room is ONE generated map holding a shell per
// tier (layers Floor/Wall/Decor for tier 0, `_t1`…`_t3` above); the scene creates only the owned
// tier's shell, remaps theme tiles at runtime, and keeps the camera inside the owned space.
import { TIER_AREAS } from '../room/placement'

const TILE = 16
const SHELL_LAYER = /^(?:Floor|Wall|Decor)(?:_t([1-3]))?$/

// Tier of a shell layer ('Wall' → 0, 'Wall_t2' → 2); null for any other layer.
export function layerTier(name) {
  const m = SHELL_LAYER.exec(name ?? '')
  if (m) return m[1] ? Number(m[1]) : 0
  return null
}

const knownTier = (tier) => (tier in TIER_AREAS ? tier : 0)

// Create this layer? Shell layers only for the owned tier; everything else always.
export function layerActive(name, tier) {
  const t = layerTier(name)
  return t === null || t === knownTier(tier)
}

// The owned space as one rectangle in px (the camera and the "fit to screen" scale use it).
export function shellBounds(tier) {
  const areas = TIER_AREAS[knownTier(tier)]
  const w = Math.max(...areas.map((a) => a.x + a.w)) * TILE
  const h = Math.max(...areas.map((a) => a.y + a.h)) * TILE
  return { x: 0, y: 0, w, h }
}

// Theme twin of a minimal tile: floor_minimal → floor_<theme>, wall_minimal_<x> → wall_<theme>_<x>,
// window_day → window_<theme>. Anything else, the minimal theme, or a missing twin keeps the tile.
export function themeGid(gid, theme, { tileNames, firstgid = 1 }) {
  if (!Number.isInteger(gid) || gid < firstgid || !theme || theme === 'minimal') return gid
  const name = tileNames[gid - firstgid]
  if (!name) return gid
  let twin = null
  if (name === 'floor_minimal') twin = `floor_${theme}`
  else if (name === 'window_day') twin = `window_${theme}`
  else {
    const m = /^wall_minimal_(.+)$/.exec(name)
    if (m) twin = `wall_${theme}_${m[1]}`
  }
  const at = twin ? tileNames.indexOf(twin) : -1
  return at === -1 ? gid : firstgid + at
}

// `entry` → `entry_t2` when the map has that spawn.
export function tierSpawnName(base, tier, spawnNames) {
  if (!base) return base ?? null
  const t = knownTier(tier)
  const tiered = t > 0 ? `${base}_t${t}` : base
  return spawnNames.includes(tiered) ? tiered : base
}

// Portals tagged with a tier exist only in that tier's shell.
export const portalActive = (portal, tier) => portal.tier == null || portal.tier === knownTier(tier)

// Is this point (map px) on the floor of an area the tier owns? The map has no tiles outside the
// owned walls, so a point out there looks walkable to the tile checks: resume points, restarts and
// spawns must be validated against the owned areas instead.
export function insideOwnedArea(tier, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  return TIER_AREAS[knownTier(tier)].some((a) => x >= a.x * TILE && x < (a.x + a.w) * TILE && y >= a.y * TILE && y < (a.y + a.h) * TILE)
}
