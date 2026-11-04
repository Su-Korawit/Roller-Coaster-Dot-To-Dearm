// How the player's avatar is dressed: accessory overlays that follow the character's frame, and an
// outfit hue applied to a recoloured copy of the MBTI sheet. The pure helpers are unit-tested; the
// Phaser half (createAvatarRender) is the thin shell MapScene calls.
import { ROOM_CATALOG } from '../data/roomCatalogSeed'
import { AVATAR_SLOTS } from '../room/avatar'
import { recolorPixel } from '../utils/recolor'

const FRAMES = 16 // 4 directions x 4 frames, in both the character sheets and the overlay rows
const SHEET_FRAME = 48

// Row of each accessory in the generated `avatar_accessories` sheet = its order among the catalog
// accessories (the art family iterates the catalog the same way; a test compares with the atlas).
export const ACCESSORY_ROWS = Object.fromEntries(
  Object.entries(ROOM_CATALOG).filter(([, item]) => item.kind === 'accessory').map(([id], row) => [id, row]),
)

export const overlayFrame = (frame) => (Number.isInteger(frame) && frame >= 0 && frame < FRAMES ? frame : 0)

export const hueKey = (mbti, hue) => (Number.isInteger(hue) && hue >= 1 && hue <= 359 ? `${mbti}-h${hue}` : mbti)

// Body colours only: outlines (very dark), eye whites (very light) and greys keep their pixels.
export function shouldRecolor(r, g, b) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  return l >= 0.2 && l <= 0.92 && s >= 0.08
}

export function recolorAvatarData(data, hue) {
  if (!Number.isInteger(hue) || hue === 0) return data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || !shouldRecolor(data[i], data[i + 1], data[i + 2])) continue
    const [r, g, b] = recolorPixel(data[i], data[i + 1], data[i + 2], { hue })
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
  return data
}

// The overlay sprites to show for an avatar at a given character frame.
export function accessorySprites({ avatar, frame }) {
  const worn = avatar?.accessories ?? {}
  const f = overlayFrame(frame)
  const out = []
  for (const slot of AVATAR_SLOTS) {
    const itemId = worn[slot]
    const item = typeof itemId === 'string' ? ROOM_CATALOG[itemId] : undefined
    if (!item || item.kind !== 'accessory' || item.slot !== slot) continue
    out.push({ slot, itemId, frame: ACCESSORY_ROWS[itemId] * FRAMES + f })
  }
  return out
}

const DIRS = [
  { key: 'walk-down', start: 0, end: 3 },
  { key: 'walk-up', start: 4, end: 7 },
  { key: 'walk-left', start: 8, end: 11 },
  { key: 'walk-right', start: 12, end: 15 },
]

// A recoloured copy of an MBTI sheet (and its animations), made once per hue. Returns the texture key
// to use, or the original key when there is nothing to do or the source is not loaded.
export function ensureHueTexture(scene, mbti, hue) {
  const key = hueKey(mbti, hue)
  if (key === mbti || !scene.textures.exists(mbti)) return mbti
  if (!scene.textures.exists(key)) {
    const src = scene.textures.get(mbti).getSourceImage()
    const canvas = document.createElement('canvas')
    canvas.width = src.width
    canvas.height = src.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(src, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    recolorAvatarData(img.data, hue)
    ctx.putImageData(img, 0, 0)
    const tex = scene.textures.addCanvas(key, canvas)
    const cols = Math.floor(canvas.width / SHEET_FRAME)
    for (let i = 0; i < FRAMES; i += 1) tex.add(i, 0, (i % cols) * SHEET_FRAME, Math.floor(i / cols) * SHEET_FRAME, SHEET_FRAME, SHEET_FRAME)
  }
  for (const { key: dir, start, end } of DIRS) {
    const animKey = `${key}-${dir}`
    if (!scene.anims.exists(animKey)) scene.anims.create({ key: animKey, frames: scene.anims.generateFrameNumbers(key, { start, end }), frameRate: 8, repeat: -1 })
  }
  if (!scene.anims.exists(`${key}-idle`)) scene.anims.create({ key: `${key}-idle`, frames: scene.anims.generateFrameNumbers(key, { frames: [0] }), frameRate: 1, repeat: 0 })
  return key
}

// Phaser half. getAvatar() -> { accessories, outfitHue }. Call update() every frame; sync() when the
// avatar may have changed (it swaps the texture for a hue and rebuilds the overlays).
export function createAvatarRender(scene, getAvatar) {
  const overlays = new Map() // slot -> sprite
  let appliedHue = null

  const sync = () => {
    const avatar = getAvatar() ?? {}
    const hue = Number.isInteger(avatar.outfitHue) ? avatar.outfitHue : null
    if (hue !== appliedHue && scene.player && scene.baseMbti) {
      appliedHue = hue
      const key = ensureHueTexture(scene, scene.baseMbti, hue)
      scene.currentMbti = key
      scene.player.setTexture(key)
      scene.player.play(`${key}-idle`)
    }
  }

  const update = () => {
    const avatar = getAvatar()
    const frame = Number(scene.player?.frame?.name)
    const wanted = new Map(accessorySprites({ avatar, frame }).map((o) => [o.slot, o]))
    for (const [slot, sprite] of overlays) {
      if (!wanted.has(slot)) { sprite.destroy(); overlays.delete(slot) }
    }
    for (const [slot, o] of wanted) {
      let sprite = overlays.get(slot)
      if (!sprite) {
        sprite = scene.add.sprite(scene.player.x, scene.player.y, 'avatar_accessories', o.frame)
        overlays.set(slot, sprite)
      }
      sprite.setFrame(o.frame).setPosition(scene.player.x, scene.player.y).setScale(scene.player.scaleX).setDepth(scene.player.depth + 0.1)
    }
  }

  const destroy = () => { for (const s of overlays.values()) s.destroy(); overlays.clear() }
  scene.events.once('shutdown', destroy)
  sync()
  return { sync, update, destroy }
}
