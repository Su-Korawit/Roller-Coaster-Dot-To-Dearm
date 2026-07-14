/**
 * File Bag entitlement catalog seeds (ADR-0016).
 *
 * Coins prices are placeholders — Idea asked 29/59 THB/month; map to Coins
 * once product confirms the shop THB→Coins ratio. Write these docs to
 * entitlementCatalog with `active: true` via Admin console or a seed script.
 *
 * storage-5gb:  { kind: 'storage-quota', priceCoins: 290, payload: { extraBytes: 5368709120 }, active: true, name: 'Bag +5GB' }
 * storage-25gb: { kind: 'storage-quota', priceCoins: 590, payload: { extraBytes: 26843545600 }, active: true, name: 'Bag +25GB' }
 */
export const BAG_STORAGE_CATALOG_SEEDS = [
  {
    id: 'storage-5gb',
    kind: 'storage-quota',
    name: 'File Bag +5GB',
    priceCoins: 290,
    payload: { extraBytes: 5 * 1024 * 1024 * 1024 },
    active: true,
  },
  {
    id: 'storage-25gb',
    kind: 'storage-quota',
    name: 'File Bag +25GB',
    priceCoins: 590,
    payload: { extraBytes: 25 * 1024 * 1024 * 1024 },
    active: true,
  },
]
