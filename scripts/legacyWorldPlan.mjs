// What purgeLegacyWorld.mjs deletes, and what it must never touch. Pure so it is unit-tested.

// Whole collections of the farm and the Personal Map.
export const LEGACY_COLLECTIONS = ['farmPlants', 'farmItems', 'farmShops', 'maps']

// Fields on users/{uid} written by the farm / inventory syncs.
export const LEGACY_USER_FIELDS = ['inventory', 'farmGold', 'inventoryUpdatedAt']

// Economy and progress that survive the purge (the study room and focus read them).
export const PROTECTED_USER_FIELDS = ['coins', 'focusXp', 'leaves', 'roomInventory', 'welcomePack', 'entitlements']

// Collections that must never be listed for deletion.
export const PROTECTED_COLLECTIONS = ['users', 'rooms', 'roomCatalog', 'focusSessions', 'focusActive', 'focusDaily', 'purchases']

// Legacy fields actually present on one user document.
export const legacyFieldsPresent = (data) => LEGACY_USER_FIELDS.filter((f) => data && Object.hasOwn(data, f))

// counts: { collections: { name: n }, userFields: { field: n } } → the steps to run and a total.
export function planPurge({ collections = {}, userFields = {} }) {
  const steps = [
    ...LEGACY_COLLECTIONS.map((name) => ({ kind: 'delete-collection', name, count: collections[name] ?? 0 })),
    ...LEGACY_USER_FIELDS.map((field) => ({ kind: 'unset-user-field', name: field, count: userFields[field] ?? 0 })),
  ]
  return { steps, total: steps.reduce((n, s) => n + s.count, 0) }
}
