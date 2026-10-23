// Avatar rules (accessories + outfit hue). functions/avatarLogic.js is the same logic in CJS; both
// run src/room/avatarFixtures.json. The server is the authority (saveAvatar); the wardrobe uses
// this copy to disable what would be refused.

export const AVATAR_SLOTS = ['head', 'face', 'neck', 'back']
export const EMPTY_AVATAR = { accessories: {}, outfitHue: null }

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

export function validateAvatar({ avatar, catalog, inventory }) {
  if (!isObject(avatar) || !isObject(avatar.accessories)) return { ok: false, errors: [{ code: 'bad_avatar' }] }
  const errors = []
  const hue = avatar.outfitHue
  if (hue !== null && hue !== undefined && !(Number.isInteger(hue) && hue >= 0 && hue <= 359)) errors.push({ code: 'bad_hue' })
  for (const [slot, itemId] of Object.entries(avatar.accessories)) {
    if (!AVATAR_SLOTS.includes(slot)) {
      errors.push({ code: 'bad_slot', slot })
      continue
    }
    if (itemId === null || itemId === undefined) continue
    const item = typeof itemId === 'string' ? catalog?.[itemId] : undefined
    if (!item || item.kind !== 'accessory') {
      errors.push({ code: 'unknown_item', slot })
    } else if (item.slot !== slot) {
      errors.push({ code: 'wrong_slot', slot, itemId })
    } else if (Number(inventory?.[itemId] ?? 0) < 1) {
      errors.push({ code: 'not_owned', slot, itemId })
    }
  }
  return { ok: errors.length === 0, errors }
}

// What was stored, made safe to draw: only known slots with a string id, a hue that is an integer
// 0-359. Anything else becomes the empty avatar (a fresh object each time).
export function sanitizeAvatar(raw) {
  if (!isObject(raw) || !isObject(raw.accessories)) return { accessories: {}, outfitHue: null }
  const accessories = {}
  for (const slot of AVATAR_SLOTS) if (typeof raw.accessories[slot] === 'string') accessories[slot] = raw.accessories[slot]
  const hue = Number.isInteger(raw.outfitHue) && raw.outfitHue >= 0 && raw.outfitHue <= 359 ? raw.outfitHue : null
  return { accessories, outfitHue: hue }
}
