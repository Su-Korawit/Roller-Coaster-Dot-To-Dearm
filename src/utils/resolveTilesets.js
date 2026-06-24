// Auto-resolve Tiled tileset names to existing Storage paths by filename.
// Pure: caller supplies the path listing.

const norm = (s) => String(s).toLowerCase().replace(/[\s_]+/g, '')

function baseNoExt(path) {
  const file = path.split('/').pop() || ''
  return file.replace(/\.[^.]+$/, '')
}

export function autoMatchTilesets(names, storagePaths) {
  const byNorm = new Map()
  for (const p of storagePaths) {
    const key = norm(baseNoExt(p))
    if (!byNorm.has(key)) byNorm.set(key, p) // first wins; deterministic on caller order
  }
  const matched = {}
  const unmatched = []
  for (const name of names) {
    const hit = byNorm.get(norm(name))
    if (hit) matched[name] = hit
    else unmatched.push(name)
  }
  return { matched, unmatched }
}
