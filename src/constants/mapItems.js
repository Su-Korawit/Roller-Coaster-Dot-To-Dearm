// Decoration palette for Personal Maps.
// Each entry maps a stable item key (stored in Firestore) to the Phaser
// sprite key that is already preloaded for the outdoor GameScene.
export const MAP_ITEMS = [
  { key: 'wood_bridge',  spriteKey: 'Wood_Bridge',               label: 'Wood Bridge' },
  { key: 'grass_things', spriteKey: 'Basic_Grass_Biom_things_1', label: 'Grass Items' },
]

export const MAP_ITEM_BY_KEY = Object.fromEntries(MAP_ITEMS.map((i) => [i.key, i]))
