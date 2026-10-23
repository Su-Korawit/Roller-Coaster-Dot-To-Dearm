// Paints the studygram card (layers from src/room/cardLayers.js) onto a canvas and returns a PNG blob.
// The scene is drawn small (135 x 169 "pixels") and scaled up by a whole number with smoothing off, so
// the pixel art stays crisp; the text goes on at full size afterwards. Missing sprite sheets are
// skipped: a card without a pet is better than no card.
import focusAtlas from '../../public/assets/rc/focus.json'
import { CARD_W, CARD_H } from '../room/cardLayers'
import { PET_ROWS } from '../game/petBehaviour'

export const PIXEL = 8
export const SCENE_W = CARD_W / PIXEL // 135
export const SCENE_H = Math.ceil(CARD_H / PIXEL) // 169

const INK = '#2B2550'
const LINE = '#5C4E92'
const SKY = {
  morning: ['#FBE6C2', '#F9D4B0'],
  day: ['#E1F3FB', '#A4D3EC'],
  evening: ['#F6BFA6', '#F2A9A0'],
  night: ['#463C74', '#2B2550'],
}
const WALL = { minimal: '#FFFFFF', library_wood: '#E8D2B2', cafe: '#FBE6C2', night_sky: '#463C74' }
const SLOT_AT = { left: [4, 90], centre: [50, 90], right: [99, 90], back: [88, 52] }
const SHEETS = { items: '/assets/rc/room_items.png', focus: '/assets/rc/focus.png', pets: '/assets/rc/pets.png' }
const PET_SIT = 6

const defaultCreateCanvas = (w, h) => {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
const defaultLoadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error(`image failed: ${src}`))
  img.src = src
})

const toBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas produced no image'))), 'image/png')
})

function drawScene(ctx, layers, images) {
  const sky = layers.find((l) => l.kind === 'sky')
  const wall = layers.find((l) => l.kind === 'wall')
  const [top, bottom] = SKY[sky?.period] ?? SKY.day
  ctx.fillStyle = WALL[wall?.theme] ?? WALL.minimal
  ctx.fillRect(0, 0, SCENE_W, 112)
  // the window: sky in two bands, a frame and a sill
  ctx.fillStyle = LINE
  ctx.fillRect(20, 8, 95, 56)
  ctx.fillStyle = top
  ctx.fillRect(22, 10, 91, 26)
  ctx.fillStyle = bottom
  ctx.fillRect(22, 36, 91, 26)
  ctx.fillStyle = LINE
  ctx.fillRect(66, 10, 3, 52)
  ctx.fillRect(20, 64, 95, 3)
  if (sky?.period === 'night') {
    ctx.fillStyle = '#FFF59A'
    for (const [x, y] of [[30, 16], [48, 24], [82, 14], [100, 30], [38, 44], [92, 50]]) ctx.fillRect(x, y, 1, 1)
  }
  // the desk
  ctx.fillStyle = '#F3E2C8'
  ctx.fillRect(0, 108, SCENE_W, SCENE_H - 108)
  ctx.fillStyle = '#E8D2B2'
  for (let y = 116; y < SCENE_H; y += 9) ctx.fillRect(0, y, SCENE_W, 1)
  ctx.fillStyle = LINE
  ctx.fillRect(0, 108, SCENE_W, 1)

  for (const l of layers) {
    if (l.kind === 'item' && images.items) {
      const [x, y] = SLOT_AT[l.slot] ?? SLOT_AT.centre
      ctx.drawImage(images.items, l.frame * 32, l.row * 32, 32, 32, x, y, 32, 32)
    } else if (l.kind === 'tree' && images.focus) {
      const row = focusAtlas.sprites[l.species === 'withered' ? 'tree_withered' : `tree_${l.species}`]?.row ?? 0
      const col = l.species === 'withered' ? 0 : Math.min(3, Math.max(0, l.stage ?? 3))
      ctx.drawImage(images.focus, col * 48, row * 48, 48, 48, 43, 48, 48, 48)
    } else if (l.kind === 'pet' && images.pets && PET_ROWS[l.petId] !== undefined) {
      ctx.drawImage(images.pets, PET_SIT * 16, PET_ROWS[l.petId] * 16, 16, 16, 10, 128, 32, 32)
    } else if (l.kind === 'phone') {
      ctx.fillStyle = LINE
      ctx.fillRect(95, 131, 24, 14)
      ctx.fillStyle = INK
      ctx.fillRect(96, 132, 22, 12)
    }
  }
}

function chip(ctx, text, x, y, { align = 'left', size = 40, weight = 600 } = {}) {
  ctx.font = `${weight} ${size}px "Chakra Petch", "Noto Sans Thai", sans-serif`
  const w = ctx.measureText?.(text)?.width ?? text.length * size * 0.6
  const padX = 16
  const left = align === 'right' ? x - w - padX * 2 : x
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillRect(left, y - size, w + padX * 2, size + 18)
  ctx.strokeStyle = LINE
  ctx.lineWidth = 4
  ctx.strokeRect(left, y - size, w + padX * 2, size + 18)
  ctx.fillStyle = INK
  ctx.textAlign = 'left'
  ctx.fillText(text, left + padX, y)
}

function drawText(ctx, layers) {
  const text = (id) => layers.find((l) => l.kind === 'text' && l.id === id)
  const tag = text('tag')
  const duration = text('duration')
  const goal = text('goal')
  const streak = text('streak')
  ctx.textBaseline = 'alphabetic'
  if (tag) chip(ctx, tag.text, 36, 72, { size: 32 })
  if (duration) {
    ctx.font = '700 170px "Chakra Petch", monospace'
    ctx.textAlign = 'right'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 18
    ctx.strokeStyle = '#FFFFFF'
    ctx.strokeText(duration.text, CARD_W - 48, CARD_H - 150)
    ctx.fillStyle = INK
    ctx.fillText(duration.text, CARD_W - 48, CARD_H - 150)
    chip(ctx, duration.unit, CARD_W - 48, CARD_H - 70, { align: 'right', size: 44, weight: 700 })
  }
  if (goal) chip(ctx, goal.text, CARD_W - 48, CARD_H - 330, { align: 'right', size: 38 })
  if (streak) chip(ctx, streak.text, CARD_W - 48, CARD_H - (goal ? 410 : 330), { align: 'right', size: 38 })
}

export async function renderCard({ layers, createCanvas = defaultCreateCanvas, loadImage = defaultLoadImage }) {
  const scene = createCanvas(SCENE_W, SCENE_H)
  const out = createCanvas(CARD_W, CARD_H)
  if (!scene || !out) throw new Error('no canvas available')

  const images = Object.fromEntries(await Promise.all(Object.entries(SHEETS).map(async ([k, src]) => {
    try { return [k, await loadImage(src)] } catch { return [k, null] }
  })))

  const sctx = scene.getContext('2d')
  sctx.imageSmoothingEnabled = false
  drawScene(sctx, layers, images)

  const octx = out.getContext('2d')
  octx.imageSmoothingEnabled = false
  octx.drawImage(scene, 0, 0, SCENE_W * PIXEL, SCENE_H * PIXEL)
  try { await globalThis.document?.fonts?.load?.('700 100px "Chakra Petch"') } catch { /* the fallback font still draws */ }
  drawText(octx, layers)
  return toBlob(out)
}
