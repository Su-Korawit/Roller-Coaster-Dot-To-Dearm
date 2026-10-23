/* global module */
// Pure Study Room economy rules (no firebase-admin, so they unit-test under the root vitest
// run). The callables in index.js read Firestore, call these, then write inside one
// transaction. STARTER_ITEMS mirrors src/data/roomCatalogSeed.js (roomLogic.test.js checks).

const WELCOME_LEAVES = 100
const UNIQUE_KINDS = ['theme', 'tier', 'pet', 'accessory']

const STARTER_ITEMS = {
  desk_basic: 1, chair_basic: 1, bed_basic: 1, bookshelf_basic: 1,
  lamp_desk: 1, plant_small: 1, rug_round: 1, theme_minimal: 1,
}

// Default room for a new account: positions are px (multiples of 8); the lamp sits in the
// desk's left slot, so its x/y are the desk's.
const STARTER_LAYOUT = {
  tier: 0,
  theme: 'minimal',
  petId: null,
  placed: [
    { itemId: 'bed_basic', x: 16, y: 16 },
    { itemId: 'desk_basic', x: 96, y: 32 },
    { itemId: 'chair_basic', x: 104, y: 48 },
    { itemId: 'lamp_desk', x: 96, y: 32, slot: 'left' },
    { itemId: 'bookshelf_basic', x: 144, y: 32 },
    { itemId: 'rug_round', x: 64, y: 80 },
  ],
}

function fail(code, message, extra) {
  const err = new Error(message)
  err.code = code
  if (extra) err.extra = extra
  return err
}

// Decides one purchase from the data the transaction read. Throws { code, extra } for
// the callable to turn into an HttpsError; never mutates its inputs.
function planPurchase({ item, itemId, leaves, inventory, currentTier }) {
  if (!item) throw fail('not-found', 'Item is not available.')
  if (!Number.isInteger(item.price) || item.price < 0) throw fail('failed-precondition', 'Item has no valid price.')
  if (UNIQUE_KINDS.includes(item.kind) && Number(inventory?.[itemId] ?? 0) >= 1) {
    throw fail('failed-precondition', 'Already owned.', { reason: 'ALREADY_OWNED' })
  }
  if (item.requires && Number(inventory?.[item.requires] ?? 0) < 1) {
    throw fail('failed-precondition', 'Requires another item first.', { reason: 'REQUIRES_MISSING', requires: item.requires })
  }
  if (Number(item.tierMin ?? 0) > Number(currentTier ?? 0)) {
    throw fail('failed-precondition', 'Room tier too low.', { reason: 'TIER_REQUIRED', tierMin: item.tierMin })
  }
  const balance = Number(leaves ?? 0)
  if (balance < item.price) {
    throw fail('failed-precondition', 'Not enough Leaves.', { reason: 'INSUFFICIENT_LEAVES', missing: item.price - balance })
  }
  return { price: item.price, inventoryDelta: { [itemId]: 1 } }
}

const planWelcomePack = ({ welcomePack }) => ({ grant: welcomePack !== 'v2' })

module.exports = { WELCOME_LEAVES, STARTER_ITEMS, STARTER_LAYOUT, planPurchase, planWelcomePack }
