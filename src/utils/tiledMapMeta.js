// Extract the spawn/portal/tileset metadata the game + dashboard need from a
// parsed Tiled JSON. Pure: no Phaser, no IO.

function propValue(obj, key) {
  const p = (obj.properties || []).find((pr) => pr.name === key)
  return p ? p.value : null
}

function objectLayer(map, name) {
  return (map.layers || []).find((l) => l.name === name && l.type === 'objectgroup') || null
}

function interactionsFrom(map) {
  const layer = objectLayer(map, 'Interactions')
  return (layer?.objects || []).map((o) => ({
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    action: propValue(o, 'action'),
    shopId: propValue(o, 'shopId'),
    // School Hub actions (ADR 0018): focusSeat -> seatId, board -> boardId, tool -> route
    seatId: propValue(o, 'seatId'),
    boardId: propValue(o, 'boardId'),
    route: propValue(o, 'route'),
    // Open House campus (ADR-0026): building -> buildingId (a faculty door), directory -> the hall board
    buildingId: propValue(o, 'buildingId'),
    name: o.name || null,
  }))
}

function labelsFrom(map) {
  const layer = objectLayer(map, 'Labels')
  return (layer?.objects || [])
    .map((o) => ({
      x: o.x,
      y: o.y,
      text: propValue(o, 'text') ?? '',
      color: propValue(o, 'color') ?? '#000000',
    }))
    .filter((l) => l.text !== '')
}

// Ambient wildlife the scene spawns (not tiles): { kind, x, y, radius } in map px.
function crittersFrom(map) {
  const layer = objectLayer(map, 'Critters')
  return (layer?.objects || []).map((o) => ({
    kind: propValue(o, 'kind') ?? o.name,
    x: o.x,
    y: o.y,
    radius: propValue(o, 'radius') ?? 32,
  }))
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
    name: o.name || null,
    x: o.x,
    y: o.y,
    width: o.width,
    height: o.height,
    target: propValue(o, 'target'),
    targetSpawn: propValue(o, 'targetSpawn'),
    tier: propValue(o, 'tier'),
  }))

  return {
    width: map.width,
    height: map.height,
    tilesetNames,
    spawns,
    defaultSpawnName,
    portals,
    interactions: interactionsFrom(map),
    labels: labelsFrom(map),
    critters: crittersFrom(map),
  }
}
