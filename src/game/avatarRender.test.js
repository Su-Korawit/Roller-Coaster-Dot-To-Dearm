import { describe, it, expect } from 'vitest'
import { overlayFrame, hueKey, shouldRecolor, recolorAvatarData, accessorySprites, ACCESSORY_ROWS } from './avatarRender'
import { ROOM_CATALOG } from '../data/roomCatalogSeed'
import { readFileSync } from 'node:fs'

const rgba = (...px) => new Uint8ClampedArray(px.flat())

describe('overlayFrame', () => {
  it('is the character frame itself: overlays share the 4 x 4 frame order of the MBTI sheets', () => {
    for (let f = 0; f < 16; f += 1) expect(overlayFrame(f)).toBe(f)
  })
  it('falls back to the first front frame for a missing or foreign frame', () => {
    expect(overlayFrame(undefined)).toBe(0)
    expect(overlayFrame('__BASE')).toBe(0)
    expect(overlayFrame(99)).toBe(0)
    expect(overlayFrame(-1)).toBe(0)
  })
})

describe('hueKey', () => {
  it('is the original texture for no hue or hue 0, a stable per-hue key otherwise', () => {
    expect(hueKey('INTJ', null)).toBe('INTJ')
    expect(hueKey('INTJ', undefined)).toBe('INTJ')
    expect(hueKey('INTJ', 0)).toBe('INTJ')
    expect(hueKey('INTJ', 120)).toBe('INTJ-h120')
    expect(hueKey('INTJ', 120)).toBe(hueKey('INTJ', 120))
  })
  it('ignores a hue that is not a whole number 1-359', () => {
    for (const bad of [-5, 360, 12.5, '90', NaN]) expect(hueKey('ENFP', bad)).toBe('ENFP')
  })
})

describe('shouldRecolor / recolorAvatarData', () => {
  it('recolors saturated mid-tones and leaves outlines, whites and greys alone', () => {
    expect(shouldRecolor(200, 140, 210)).toBe(true) // the lilac body
    expect(shouldRecolor(20, 10, 40)).toBe(false) // outline
    expect(shouldRecolor(255, 255, 255)).toBe(false) // eye white
    expect(shouldRecolor(128, 128, 128)).toBe(false) // grey
  })

  it('leaves transparent pixels completely alone, even with colour values', () => {
    const data = rgba([200, 140, 210, 0])
    recolorAvatarData(data, 120)
    expect([...data]).toEqual([200, 140, 210, 0])
  })

  it('rotates a body pixel and keeps its alpha, and keeps outline pixels as they were', () => {
    const data = rgba([200, 140, 210, 255], [20, 10, 40, 255])
    recolorAvatarData(data, 120)
    expect([data[0], data[1], data[2]]).not.toEqual([200, 140, 210])
    expect(data[3]).toBe(255)
    expect([data[4], data[5], data[6], data[7]]).toEqual([20, 10, 40, 255])
  })

  it('hue 0 changes nothing', () => {
    const data = rgba([200, 140, 210, 255])
    recolorAvatarData(data, 0)
    expect([...data]).toEqual([200, 140, 210, 255])
  })
})

describe('accessorySprites', () => {
  const frame = 5
  it('one overlay per worn accessory, at the player, using the sheet row of the accessory', () => {
    const out = accessorySprites({ avatar: { accessories: { head: 'acc_cap', neck: 'acc_scarf' }, outfitHue: null }, frame })
    expect(out).toEqual([
      { slot: 'head', itemId: 'acc_cap', frame: ACCESSORY_ROWS.acc_cap * 16 + frame },
      { slot: 'neck', itemId: 'acc_scarf', frame: ACCESSORY_ROWS.acc_scarf * 16 + frame },
    ])
  })
  it('skips unknown ids, ids that are not accessories and a wrong slot', () => {
    expect(accessorySprites({ avatar: { accessories: { head: 'acc_ghost', face: 'desk_basic', neck: 'acc_cap' } }, frame })).toEqual([])
  })
  it('an empty or missing avatar draws nothing', () => {
    expect(accessorySprites({ avatar: undefined, frame })).toEqual([])
    expect(accessorySprites({ avatar: { accessories: {} }, frame })).toEqual([])
  })
})

describe('ACCESSORY_ROWS', () => {
  it('matches the generated wardrobe atlas row for row', () => {
    const atlas = JSON.parse(readFileSync(new URL('../../public/assets/rc/wardrobe.json', import.meta.url), 'utf8'))
    for (const [id, { row }] of Object.entries(atlas.sprites)) expect(ACCESSORY_ROWS[id], id).toBe(row)
    expect(Object.keys(ACCESSORY_ROWS).sort()).toEqual(Object.entries(ROOM_CATALOG).filter(([, i]) => i.kind === 'accessory').map(([id]) => id).sort())
  })
})
