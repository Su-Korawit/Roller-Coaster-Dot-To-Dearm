import { describe, it, expect, vi } from 'vitest'
import { renderCard, SCENE_W, SCENE_H, PIXEL } from './renderCard'
import { cardLayers, CARD_W, CARD_H } from '../room/cardLayers'
import { ROOM_CATALOG } from '../data/roomCatalogSeed'

const layout = { tier: 0, theme: 'minimal', petId: 'pet_shiba', placed: [{ itemId: 'desk_basic', x: 96, y: 32 }, { itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' }] }
const layers = cardLayers({
  now: new Date(2026, 9, 24, 14), layout, catalog: ROOM_CATALOG, inventory: { desk_basic: 1, lamp_desk: 1, pet_shiba: 1 },
  tree: 'tree', pet: 'pet_shiba', strict: true, minutes: 150, dayNumber: 14, showGoal: true, goalText: 'แพทยศาสตร์', showStreak: true, streak: 14,
})

function fakeCanvas(w, h, log) {
  const calls = []
  const ctx = new Proxy({ calls }, {
    get: (t, p) => (p in t ? t[p] : (...a) => { calls.push([p, ...a]); return undefined }),
    set: (t, p, v) => { t[p] = v; calls.push(['set', p, v]); return true },
  })
  const canvas = { width: w, height: h, getContext: () => ctx, toBlob: (cb, type) => cb(new Blob(['x'], { type })), calls }
  log.push(canvas)
  return canvas
}
const run = async (extra = {}) => {
  const made = []
  const blob = await renderCard({ layers, createCanvas: (w, h) => fakeCanvas(w, h, made), loadImage: async () => ({ width: 96, height: 96 }), ...extra })
  return { blob, made }
}
const texts = (canvas) => canvas.calls.filter((c) => c[0] === 'fillText').map((c) => c[1])

describe('renderCard', () => {
  it('draws the scene small and scales it by a whole number, never smoothing', async () => {
    expect(PIXEL).toBe(8)
    expect(SCENE_W * PIXEL).toBe(1080)
    expect(SCENE_H * PIXEL).toBeGreaterThanOrEqual(1350)
    const { made } = await run()
    const [scene, out] = made
    expect([scene.width, scene.height]).toEqual([SCENE_W, SCENE_H])
    expect([out.width, out.height]).toEqual([CARD_W, CARD_H])
    expect(out.calls.some((c) => c[0] === 'set' && c[1] === 'imageSmoothingEnabled' && c[2] === false)).toBe(true)
    expect(out.calls.some((c) => c[0] === 'drawImage' && c[1] === scene)).toBe(true)
  })

  it('returns a PNG blob', async () => {
    const { blob } = await run()
    expect(blob.type).toBe('image/png')
  })

  it('paints the text layers: big duration, tag, goal and streak', async () => {
    const { made } = await run()
    const all = made.flatMap(texts)
    for (const t of ['2:30', 'ชม.', 'day 14, ilovetcas.com', 'แพทยศาสตร์', 'ติดต่อกัน 14 วัน']) expect(all, t).toContain(t)
  })

  it('draws sprites from the loaded sheets', async () => {
    const { made } = await run()
    const draws = made[0].calls.filter((c) => c[0] === 'drawImage')
    expect(draws.length).toBeGreaterThanOrEqual(3) // lamp, tree, pet
  })

  it('still produces the card, with its text, when a sheet fails to load', async () => {
    const { made } = await run({ loadImage: vi.fn().mockRejectedValue(new Error('404')) })
    expect(made.flatMap(texts)).toContain('2:30')
    expect(made[0].calls.filter((c) => c[0] === 'drawImage')).toHaveLength(0)
  })

  it('rejects when there is no canvas to draw on', async () => {
    await expect(renderCard({ layers, createCanvas: () => null, loadImage: async () => null })).rejects.toThrow()
  })

  it('rejects when the browser cannot turn the canvas into a blob', async () => {
    const bad = (w, h) => ({ ...fakeCanvas(w, h, []), toBlob: (cb) => cb(null) })
    await expect(renderCard({ layers, createCanvas: bad, loadImage: async () => null })).rejects.toThrow()
  })
})
