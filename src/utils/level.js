// Student level from lifetime Focus XP (1 XP ~ 1 verified minute, before perks).
// xpForLevel(n) = 30·n·(n−1): level 2 at 1 h, 3 at 3 h, 4 at 6 h, 5 at 10 h, 10 at 45 h…
// Quadratic so early levels come quickly (a first win) and later ones are earned.

export const MAX_LEVEL = 50

export const xpForLevel = (n) => 30 * n * (n - 1)

export function levelFromXp(xp) {
  const x = Math.max(0, Number.isFinite(xp) ? xp : 0)
  // Largest n with 30·n·(n−1) <= x, from the quadratic formula, then corrected for float error.
  let n = Math.floor((1 + Math.sqrt(1 + (4 * x) / 30)) / 2)
  while (xpForLevel(n + 1) <= x) n += 1
  while (n > 1 && xpForLevel(n) > x) n -= 1
  return Math.min(MAX_LEVEL, Math.max(1, n))
}

// { level, xp, floor, next, ratio } — ratio is progress through the current level (1 at max level).
export function levelProgress(xp) {
  const x = Math.max(0, Number.isFinite(xp) ? xp : 0)
  const level = levelFromXp(x)
  const floor = xpForLevel(level)
  if (level >= MAX_LEVEL) return { level, xp: x, floor, next: null, ratio: 1 }
  const next = xpForLevel(level + 1)
  return { level, xp: x, floor, next, ratio: (x - floor) / (next - floor) }
}
