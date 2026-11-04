import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { furnitureSprites, potFrame, itemFrame, ROOM_ITEM_ROWS, ITEM_SHEET_COLS, POT_ROW, SLOT_OFFSETS } from './roomRender'
import { ROOM_CATALOG } from '../data/roomCatalogSeed'

const layout = (placed) => ({ tier: 0, theme: 'minimal', petId: null, placed })
const desk = { itemId: 'desk_basic', x: 96, y: 32 }

describe('furnitureSprites', () => {
  it('draws a slotted lamp above its desk, offset to the slot', () => {
    const sprites = furnitureSprites({
      layout: layout([desk, { itemId: 'lamp_desk', x: 96, y: 32, slot: 'right' }]),
      catalog: ROOM_CATALOG,
    })
    const d = sprites.find((s) => s.itemId === 'desk_basic')
    const lamp = sprites.find((s) => s.itemId === 'lamp_desk')
    expect(lamp.depth).toBeGreaterThan(d.depth)
    expect(lamp.x).toBe(96 + SLOT_OFFSETS.right.x)
  })

  it('anchors each frame by its bottom-left corner to the bottom of the footprint', () => {
    const [s] = furnitureSprites({ layout: layout([{ itemId: 'chair_basic', x: 104, y: 48 }]), catalog: ROOM_CATALOG })
    expect([s.x, s.y]).toEqual([104, 48 + 16])
    expect(s.key).toBe('room_items')
  })

  it('orders floor items back to front by their bottom edge', () => {
    const sprites = furnitureSprites({
      layout: layout([{ itemId: 'chair_basic', x: 32, y: 80 }, { itemId: 'chair_basic', x: 32, y: 16 }]),
      catalog: ROOM_CATALOG,
    })
    expect(sprites[0].y).toBeLessThan(sprites[1].y)
    expect(sprites[0].depth).toBeLessThan(sprites[1].depth)
  })

  it('keeps rugs under furniture and wall items behind everything', () => {
    const sprites = furnitureSprites({
      layout: layout([{ itemId: 'rug_round', x: 64, y: 80 }, { itemId: 'chair_basic', x: 64, y: 80 }, { itemId: 'poster_pastel', x: 32, y: 0 }]),
      catalog: ROOM_CATALOG,
    })
    const depth = (id) => sprites.find((s) => s.itemId === id).depth
    expect(depth('poster_pastel')).toBeLessThan(depth('rug_round'))
    expect(depth('rug_round')).toBeLessThan(depth('chair_basic'))
  })

  it('skips an item the catalog no longer has, keeping the rest', () => {
    const sprites = furnitureSprites({
      layout: layout([{ itemId: 'ghost', x: 8, y: 8 }, { itemId: 'chair_basic', x: 32, y: 32 }]),
      catalog: ROOM_CATALOG,
    })
    expect(sprites.map((s) => s.itemId)).toEqual(['chair_basic'])
  })

  it('picks the lit frame for a lamp when asked', () => {
    const [s] = furnitureSprites({ layout: layout([{ itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' }, desk]), catalog: ROOM_CATALOG, lit: true }).filter((x) => x.itemId === 'lamp_desk')
    expect(s.frame % ITEM_SHEET_COLS).toBe(1)
  })
})

describe('potFrame', () => {
  it('grows through four stages with progress', () => {
    expect([0, 0.2, 0.34, 0.5, 0.67, 0.9, 1].map(potFrame)).toEqual([POT_ROW * 4, POT_ROW * 4, POT_ROW * 4 + 1, POT_ROW * 4 + 1, POT_ROW * 4 + 2, POT_ROW * 4 + 2, POT_ROW * 4 + 3])
  })
})

describe('item atlas', () => {
  it('matches the generated room_items atlas row for row', () => {
    const atlas = JSON.parse(readFileSync(new URL('../../public/assets/rc/room_items.json', import.meta.url), 'utf8'))
    for (const [id, { row }] of Object.entries(atlas.sprites)) expect(ROOM_ITEM_ROWS[id], id).toBe(row)
    expect(Object.keys(ROOM_ITEM_ROWS).sort()).toEqual(Object.keys(atlas.sprites).sort())
    expect(itemFrame('lamp_desk', 1)).toBe(ROOM_ITEM_ROWS.lamp_desk * ITEM_SHEET_COLS + 1)
  })

  it('matches the focus atlas for the pot row', () => {
    const atlas = JSON.parse(readFileSync(new URL('../../public/assets/rc/focus.json', import.meta.url), 'utf8'))
    expect(atlas.sprites.pot_growth.row).toBe(POT_ROW)
  })
})
