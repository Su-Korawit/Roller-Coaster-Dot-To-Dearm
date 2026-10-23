// The study-room pet: a small seeded state machine and the geometry it walks on. Pure (no Phaser):
// the scene feeds it time, the player's position, "a focus session is running" and taps, and draws the
// result with `petFrame`. It never leaves the floor and never enters furniture.
import { TIER_AREAS } from '../room/placement'

const TILE = 16
const BLOCKING = ['furniture', 'desk']
const MARGIN = 3 // px kept clear around furniture
const WANDER_SPEED = 22 // px/s
const COME_SPEED = 28
const SEAT_OFFSETS = [[14, 0], [-14, 0], [0, 14], [0, -14], [12, 12], [-12, 12], [12, -12], [-12, -12]]
const HEART_MS = 1200
const MAX_CHUNK = 100

// Row of each pet in the generated pets sheet (the heart row follows the pets).
export const PET_ROWS = { pet_cat_orange: 0, pet_cat_black: 1, pet_shiba: 2, pet_bunny: 3 }

export const PET_FRAMES = { idle: 0, walkA: 1, walkB: 2, groomA: 3, groomB: 4, sleep: 5, sit: 6 }

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const grow = (r, m) => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m })

// Where a pet can walk in a room: the owned floor areas without the wall ring and the wall shadow
// row, minus the footprints of furniture and desks; `bed` is the centre of a placed pet bed.
export function petFloor({ tier, placed, catalog }) {
  const areas = TIER_AREAS[tier] ?? TIER_AREAS[0]
  const floor = areas.map((a) => ({ x: (a.x + 1) * TILE, y: (a.y + 2) * TILE, w: (a.w - 2) * TILE, h: (a.h - 3) * TILE }))
  const blocked = []
  let bed = null
  for (const p of Array.isArray(placed) ? placed : []) {
    const item = p && catalog?.[p.itemId]
    if (!item || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue
    const [fw, fh] = item.footprint ?? [1, 1]
    if (BLOCKING.includes(item.kind)) blocked.push({ x: p.x, y: p.y, w: fw * TILE, h: fh * TILE })
    if (p.itemId === 'pet_bed') bed = { x: p.x + (fw * TILE) / 2, y: p.y + (fh * TILE) / 2 }
  }
  return { floor, blocked, bed }
}

export const walkableAt = (room, x, y) =>
  room.floor.some((r) => inside(r, x, y)) && !room.blocked.some((b) => inside(grow(b, MARGIN), x, y))

// mulberry32, with the state kept in the pet so a seed fully decides its life.
function rand(pet) {
  let t = (pet.rng += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (pet, lo, hi) => lo + rand(pet) * (hi - lo)

function startPoint(room) {
  for (const r of room.floor) {
    for (let y = r.y; y <= r.y + r.h; y += 8) {
      for (let x = r.x; x <= r.x + r.w; x += 8) {
        if (walkableAt(room, x, y)) return { x, y }
      }
    }
  }
  const r = room.floor[0]
  return r ? { x: r.x, y: r.y } : { x: 0, y: 0 }
}

export function createPet({ seed = 1, room }) {
  const at = startPoint(room)
  const pet = { x: at.x, y: at.y, mode: 'idle', timer: 0, facing: 1, target: null, toBed: false, heartLeft: 0, rng: seed | 0, room }
  pet.timer = between(pet, 600, 2000)
  return pet
}

// Nearest walkable spot to the player: beside them first, then the closest floor point.
function seatFor(room, player) {
  for (const [dx, dy] of SEAT_OFFSETS) if (walkableAt(room, player.x + dx, player.y + dy)) return { x: player.x + dx, y: player.y + dy }
  let best = null
  for (const r of room.floor) {
    const p = { x: Math.min(Math.max(player.x, r.x), r.x + r.w), y: Math.min(Math.max(player.y, r.y), r.y + r.h) }
    if (!walkableAt(room, p.x, p.y)) continue
    const d = Math.hypot(p.x - player.x, p.y - player.y)
    if (!best || d < best.d) best = { ...p, d }
  }
  return best
}

// Move toward a target, sliding along furniture on one axis when the straight step is blocked.
// Returns true while still on the way.
function walk(pet, target, speed, dt) {
  const dx = target.x - pet.x
  const dy = target.y - pet.y
  const d = Math.hypot(dx, dy)
  const step = (speed * dt) / 1000
  if (d <= step || d < 0.5) {
    if (walkableAt(pet.room, target.x, target.y)) { pet.x = target.x; pet.y = target.y }
    return false
  }
  if (Math.abs(dx) > 0.5) pet.facing = dx > 0 ? 1 : -1
  const nx = pet.x + (dx / d) * step
  const ny = pet.y + (dy / d) * step
  if (walkableAt(pet.room, nx, ny)) { pet.x = nx; pet.y = ny; return true }
  if (walkableAt(pet.room, nx, pet.y)) { pet.x = nx; return true }
  if (walkableAt(pet.room, pet.x, ny)) { pet.y = ny; return true }
  return false
}

function chooseIdle(pet, reduced) {
  const r = rand(pet)
  const sleepsAtBed = !!pet.room.bed && !reduced
  if (r < 0.55 && !reduced) {
    for (let i = 0; i < 8; i += 1) {
      const a = rand(pet) * Math.PI * 2
      const len = between(pet, 20, 70)
      const t = { x: pet.x + Math.cos(a) * len, y: pet.y + Math.sin(a) * len }
      if (walkableAt(pet.room, t.x, t.y)) { pet.mode = 'wander'; pet.target = t; pet.toBed = false; return }
    }
    pet.timer = between(pet, 600, 1500)
  } else if (r < 0.8) {
    pet.mode = 'groom'
    pet.timer = between(pet, 2000, 4000)
  } else if (sleepsAtBed) {
    pet.mode = 'wander'
    pet.target = { ...pet.room.bed }
    pet.toBed = true
  } else {
    pet.mode = 'sleep'
    pet.timer = between(pet, 5000, 9000)
  }
}

function tick(pet, { dt, playerAt, focusing, tapped, reducedMotion }) {
  if (pet.mode === 'heart') {
    pet.heartLeft -= dt
    if (pet.heartLeft <= 0) { pet.mode = 'idle'; pet.timer = between(pet, 400, 1200) }
    return
  }
  if (tapped) {
    pet.mode = 'heart'
    pet.heartLeft = HEART_MS
    pet.target = null
    return
  }
  if (focusing && playerAt) {
    if (reducedMotion) { pet.mode = 'sit'; return }
    const seat = seatFor(pet.room, playerAt)
    if (seat && Math.hypot(seat.x - pet.x, seat.y - pet.y) > 2 && walk(pet, seat, COME_SPEED, dt)) { pet.mode = 'wander'; return }
    pet.mode = 'sit'
    return
  }
  if (pet.mode === 'sit') { pet.mode = 'idle'; pet.timer = between(pet, 500, 1500) }

  if (pet.mode === 'wander') {
    if (reducedMotion) { pet.mode = 'idle'; pet.target = null; return }
    const moving = pet.target && walk(pet, pet.target, WANDER_SPEED, dt)
    if (!moving) {
      pet.target = null
      if (pet.toBed) { pet.toBed = false; pet.mode = 'sleep'; pet.timer = between(pet, 6000, 10000) } else { pet.mode = 'idle'; pet.timer = between(pet, 1000, 3000) }
    }
    return
  }
  pet.timer -= dt
  if (pet.timer > 0) return
  if (pet.mode === 'groom' || pet.mode === 'sleep') { pet.mode = 'idle'; pet.timer = between(pet, 1000, 2500); return }
  chooseIdle(pet, reducedMotion)
}

// Advance by `dt` ms (big steps are split so a stalled tab cannot teleport the pet).
export function stepPet(prev, input) {
  const pet = { ...prev }
  let left = Math.max(0, Number(input.dt) || 0)
  let tapped = !!input.tapped
  while (left > 0 || tapped) {
    const dt = Math.min(left, MAX_CHUNK)
    tick(pet, { ...input, dt, tapped })
    tapped = false
    left -= dt
    if (dt === 0) break
  }
  return pet
}

export function petFrame(pet, nowMs) {
  switch (pet.mode) {
    case 'sleep': return PET_FRAMES.sleep
    case 'sit':
    case 'heart': return PET_FRAMES.sit
    case 'wander': return Math.floor(nowMs / 200) % 2 === 0 ? PET_FRAMES.walkA : PET_FRAMES.walkB
    case 'groom': return Math.floor(nowMs / 400) % 2 === 0 ? PET_FRAMES.groomA : PET_FRAMES.groomB
    default: return PET_FRAMES.idle
  }
}
