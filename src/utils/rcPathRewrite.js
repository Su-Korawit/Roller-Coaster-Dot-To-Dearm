// Rewrites a Storage path from the legacy sprites/tilesets or sprites/objects
// prefix (where Roller Coaster custom files leaked before rc/ existed — see
// docs/adr/0007) to its rc/ equivalent. Returns null for any other path.

export function toRcPath(value) {
  if (value.startsWith('sprites/tilesets/')) return value.replace('sprites/tilesets/', 'rc/tilesets/')
  if (value.startsWith('sprites/objects/')) return value.replace('sprites/objects/', 'rc/objects/')
  return null
}
