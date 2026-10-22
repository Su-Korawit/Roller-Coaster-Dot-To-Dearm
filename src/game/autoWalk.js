// Pure tile-grid pathfinding for tap-to-walk on the campus. No Phaser here: the scene supplies
// `isBlocked(x, y)` (tile collision + building footprints) and feeds the waypoints into its
// existing click-to-move fields.

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

const inside = (w, h, x, y) => x >= 0 && y >= 0 && x < w && y < h

/** Shortest 4-neighbour path from `start` to `goal` (inclusive), or null when there is none. */
export function findPath(isBlocked, w, h, start, goal) {
  if (!inside(w, h, start.x, start.y) || !inside(w, h, goal.x, goal.y)) return null
  if (isBlocked(start.x, start.y) || isBlocked(goal.x, goal.y)) return null
  const key = (x, y) => y * w + x
  const prev = new Map([[key(start.x, start.y), -1]])
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]
    if (cur.x === goal.x && cur.y === goal.y) {
      const out = []
      for (let k = key(cur.x, cur.y); k !== -1; k = prev.get(k)) out.push({ x: k % w, y: Math.floor(k / w) })
      return out.reverse()
    }
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (!inside(w, h, nx, ny) || isBlocked(nx, ny)) continue
      const k = key(nx, ny)
      if (prev.has(k)) continue
      prev.set(k, key(cur.x, cur.y))
      queue.push({ x: nx, y: ny })
    }
  }
  return null
}

/** The tile itself if free, else the closest free tile (breadth-first, ignoring walls), else null. */
export function nearestFree(isBlocked, w, h, tile) {
  if (!inside(w, h, tile.x, tile.y)) return null
  const seen = new Set([tile.y * w + tile.x])
  const queue = [tile]
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]
    if (!isBlocked(cur.x, cur.y)) return { x: cur.x, y: cur.y }
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (!inside(w, h, nx, ny)) continue
      const k = ny * w + nx
      if (seen.has(k)) continue
      seen.add(k)
      queue.push({ x: nx, y: ny })
    }
  }
  return null
}

/** Drop the tiles in the middle of straight runs: only the ends and the corners stay. */
export function simplifyPath(path) {
  if (!path || path.length < 3) return path ? path.slice() : []
  const out = [path[0]]
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1]
    const b = path[i]
    const c = path[i + 1]
    if (b.x - a.x !== c.x - b.x || b.y - a.y !== c.y - b.y) out.push(b)
  }
  out.push(path[path.length - 1])
  return out
}

/** A cancellable cursor over a list of waypoints. */
export function createWalker(waypoints) {
  const list = Array.isArray(waypoints) ? waypoints.slice() : []
  let i = 0
  return {
    get done() { return i >= list.length },
    next() { return i < list.length ? list[i++] : null },
    cancel() { i = list.length },
  }
}
