// Draws the campus: the 18 faculty sprites, the central hall and the gate, solid footprints for
// them, and the door signs that fade in as the player approaches. The pure half (frame order,
// sign list) is unit-tested; renderCampus is the thin Phaser half used by MapScene for maps whose
// config has `campus: true`.
import { BUILDINGS, BUILDING_IDS } from '../constants/openHouseBuildings'
import { PLACEMENTS, HALL, GATE, SPRITE, MAP, doorTile, footprints } from './campusLayout'
import { signAlpha } from './campusSigns'

// Frame order in the `campus_buildings` sheet (one column, 96×80 each): the 18 faculties as listed
// in the building table, then the hall and the gate. A test checks this against campus_buildings.json.
export const CAMPUS_FRAME_IDS = [...BUILDING_IDS, 'hall', 'gate']
export const campusFrame = (id) => CAMPUS_FRAME_IDS.indexOf(id)

const SHORT = Object.fromEntries(BUILDINGS.map((b) => [b.id, b.shortTh]))

// Everything the scene draws as a sprite: id, top-left tile, frame.
export function campusSprites() {
  return [...PLACEMENTS, HALL, GATE].map((p) => ({ id: p.id, x: p.x, y: p.y, frame: campusFrame(p.id) }))
}

// One sign per faculty, centred on its door strip (tile coordinates of the door centre).
export function campusSigns() {
  return PLACEMENTS.map((p) => {
    const d = doorTile(p)
    return { id: p.id, text: SHORT[p.id] ?? p.id, cx: d.x + d.w / 2, cy: d.y + d.h / 2 }
  })
}

// Phaser half. Returns { update(px, py), destroy() }; px/py are the player's world position.
export function renderCampus(scene, mapScale = 1) {
  const s = mapScale
  const tile = MAP.tile * s
  const objects = []

  for (const sp of campusSprites()) {
    if (sp.frame < 0) continue
    // Origin bottom-left at the bottom edge of the footprint: depth follows the bottom so the player
    // walks behind a building when north of it.
    const bottom = (sp.y + SPRITE.tilesH) * tile
    const img = scene.add.sprite(sp.x * tile, bottom, 'campus_buildings', sp.frame).setOrigin(0, 1).setScale(s)
    img.setDepth(5 + bottom / 100000)
    objects.push(img)
  }

  // Solid footprints: invisible static bodies the player collides with.
  if (scene.physics && scene.player) {
    for (const r of footprints()) {
      const zone = scene.add.zone(r.x * tile + (r.w * tile) / 2, r.y * tile + (r.h * tile) / 2, r.w * tile, r.h * tile)
      scene.physics.add.existing(zone, true)
      scene.physics.add.collider(scene.player, zone)
      objects.push(zone)
    }
  }

  const signs = campusSigns().map((sg) => {
    const text = scene.add.text(sg.cx * tile, (sg.cy - 0.1) * tile, sg.text, {
      fontSize: `${8 * s}px`,
      color: '#3b2f2f',
      backgroundColor: 'rgba(243, 229, 194, 0.94)',
      padding: { x: 3 * s, y: 1 * s },
    })
    text.setOrigin(0.5, 1).setDepth(12).setAlpha(0).setVisible(false)
    objects.push(text)
    return { ...sg, text }
  })

  return {
    update(px, py) {
      for (const sg of signs) {
        const dist = Math.hypot(px / tile - sg.cx, py / tile - sg.cy)
        const a = signAlpha(dist)
        sg.text.setAlpha(a).setVisible(a > 0)
      }
    },
    destroy() {
      for (const o of objects) o.destroy()
      objects.length = 0
    },
  }
}
