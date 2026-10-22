/* global module */
// Server copy of src/room/avatar.js (same logic, same fixtures: src/room/avatarFixtures.json).
// The avatar is `{ accessories: { head, face, neck, back }, outfitHue }`, saved only by the
// saveAvatar function after this check against the owner's inventory and the catalog.

const AVATAR_SLOTS = ['head', 'face', 'neck', 'back']

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function validateAvatar({ avatar, catalog, inventory }) {
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

module.exports = { AVATAR_SLOTS, validateAvatar }
