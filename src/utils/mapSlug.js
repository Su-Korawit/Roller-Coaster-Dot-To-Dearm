// Turn a human display name into a safe, immutable map key.
export function slugify(name) {
  const s = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return s || 'map'
}

// slugify then append _2, _3... until the key is not in existingKeys.
export function uniqueSlug(name, existingKeys = []) {
  const base = slugify(name)
  if (!existingKeys.includes(base)) return base
  let n = 2
  while (existingKeys.includes(`${base}_${n}`)) n++
  return `${base}_${n}`
}
