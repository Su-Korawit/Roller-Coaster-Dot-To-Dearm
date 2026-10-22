import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { CAMPUS_FRAME_IDS, campusFrame, campusSprites, campusSigns } from './campusRender'
import { BUILDING_IDS, BUILDING_BY_ID } from '../constants/openHouseBuildings'
import { PLACEMENTS, doorTile } from './campusLayout'

const sheet = JSON.parse(readFileSync(new URL('../../public/assets/rc/campus_buildings.json', import.meta.url), 'utf8'))

describe('campus frames', () => {
  it('follow the rows of the generated sheet', () => {
    CAMPUS_FRAME_IDS.forEach((id, i) => expect(sheet.sprites[id].row, id).toBe(i))
    expect(Object.keys(sheet.sprites)).toHaveLength(CAMPUS_FRAME_IDS.length)
  })
  it('are the 18 faculties then hall and gate', () => {
    expect(CAMPUS_FRAME_IDS.slice(0, 18)).toEqual(BUILDING_IDS)
    expect(CAMPUS_FRAME_IDS.slice(18)).toEqual(['hall', 'gate'])
    expect(campusFrame('nope')).toBe(-1)
  })
  it('every sprite has a frame', () => {
    const sprites = campusSprites()
    expect(sprites).toHaveLength(PLACEMENTS.length + 2)
    expect(sprites.every((s) => s.frame >= 0)).toBe(true)
  })
})

describe('campus signs', () => {
  it('one per faculty, named by its short Thai name, centred on its door strip', () => {
    const signs = campusSigns()
    expect(signs).toHaveLength(PLACEMENTS.length)
    for (const p of PLACEMENTS) {
      const sg = signs.find((x) => x.id === p.id)
      const d = doorTile(p)
      expect(sg.text).toBe(BUILDING_BY_ID[p.id].shortTh)
      expect([sg.cx, sg.cy]).toEqual([d.x + d.w / 2, d.y + d.h / 2])
    }
  })
})
