// Extract the spawn/portal/tileset metadata the game + dashboard need from a
// parsed Tiled JSON. Pure: no Phaser, no IO.

function propValue(obj, key) {
  const p = (obj.properties || []).find((pr) => pr.name === key)
  return p ? p.value : null
}

function objectLayer(map, name) {
  return (map.layers || []).find((l) => l.name === name && l.type === 'objectgroup') || null
}

export function parseMapMeta(map) {
  const tilesetNames = [...new Set((map.tilesets || []).map((t) => t.name))]

  const spawnLayer = objectLayer(map, 'Spawns')
  const spawns = (spawnLayer?.objects || []).map((o) => ({
    name: o.name,
    x: o.x,
    y: o.y,
    isDefault: propValue(o, 'default') === true,
  }))
  const flagged = spawns.find((s) => s.isDefault)
  const defaultSpawnName = flagged?.name ?? spawns[0]?.name ?? null

  const portalLayer = objectLayer(map, 'Portals')
  const portals = (portalLayer?.objects || []).map((o) => ({
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    target: propValue(o, 'target'),
    targetSpawn: propValue(o, 'targetSpawn'),
  }))

  return {
    width: map.width,
    height: map.height,
    tilesetNames,
    spawns,
    defaultSpawnName,
    portals,
  }
}
