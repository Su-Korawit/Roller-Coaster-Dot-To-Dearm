// Is a point (map pixels, unscaled) somewhere the player can stand? Used to validate a stored
// resume point: out of bounds or on a colliding tile means "use the map's spawn instead".
// `layers` are the tile layers that collide (their tiles' `collides` flag already reflects the
// "non-colliding tile covers a collider" rule applied by the scene).
export function isWalkableAt(map, layers, px, py) {
  if (!map || !Number.isFinite(px) || !Number.isFinite(py)) return false
  const tx = Math.floor(px / map.tileWidth)
  const ty = Math.floor(py / map.tileHeight)
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false
  for (const layer of layers ?? []) {
    const tile = layer.getTileAt(tx, ty)
    if (tile && tile.collides) return false
  }
  return true
}
