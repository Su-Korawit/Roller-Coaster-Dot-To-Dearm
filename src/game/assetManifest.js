// Single source of truth for the game's cloud-backed assets.
//
// PURE DATA ONLY — no imports. This module is consumed both by the browser
// (GameCanvas resolves Storage URLs from it) and by the Node upload script
// (scripts/uploadAssets.mjs), so it must not pull in the firebase browser SDK.
//
// Each entry maps a Phaser load key → Storage path → local fallback. `localPath`
// is the existing public/ URL: it doubles as the offline fallback at runtime and,
// prefixed with `public`, as the upload source on disk.

export const MBTI_TYPES = [
  'ENFJ', 'ENFP', 'ENTJ', 'ENTP',
  'ESFJ', 'ESFP', 'ESTJ', 'ESTP',
  'INFJ', 'INFP', 'INTJ', 'INTP',
  'ISFJ', 'ISFP', 'ISTJ', 'ISTP',
]

const tileset = (name) => ({
  key: name,
  type: 'image',
  storagePath: `sprites/tilesets/${name}.png`,
  localPath: `/assets/sprites/Tilesets/${name}.png`,
})

const object = (key, file) => ({
  key,
  type: 'image',
  storagePath: `sprites/objects/${file}.png`,
  localPath: `/assets/sprites/Objects/${file}.png`,
})

export const GAME_ASSETS = [
  // Tilemaps
  { key: 'test3',  type: 'tilemapJSON', storagePath: 'maps/test3.json',  localPath: '/maps/test3.json' },
  { key: 'indoor', type: 'tilemapJSON', storagePath: 'maps/indoor.json', localPath: '/maps/indoor.json' },

  // Tilesets
  tileset('Grass'),
  tileset('Water'),
  tileset('Wooden_House'),
  tileset('Wooden_House_Walls_Tilset'),
  tileset('Wooden_House_Roof_Tilset'),
  tileset('Hills'),
  tileset('Tilled_Dirt'),
  tileset('Tilled_Dirt_v2'),
  tileset('Tilled_Dirt_Wide'),
  tileset('Tilled_Dirt_Wide_v2'),
  tileset('Fences'),

  // Objects
  object('Wood_Bridge', 'Wood_Bridge'),
  object('Basic_Grass_Biom_things_1', 'Basic_Grass_Biom_things_1'),
  object('Basic_Furniture', 'Basic_Furniture'),
  object('Chest', 'Chest'),

  // Characters — one 48×48 spritesheet per MBTI type
  ...MBTI_TYPES.map((m) => ({
    key: m,
    type: 'spritesheet',
    storagePath: `sprites/characters/${m}.png`,
    localPath: `/assets/sprites/Characters/${m}_Charakter_Spritesheet.png`,
    frameConfig: { frameWidth: 48, frameHeight: 48 },
  })),
]

// Keys each Phaser scene needs, so a scene only loads what it uses.
export const GAME_SCENE_KEYS = [
  'test3',
  'Grass', 'Water', 'Wooden_House', 'Wooden_House_Walls_Tilset',
  'Wooden_House_Roof_Tilset', 'Hills', 'Tilled_Dirt', 'Tilled_Dirt_v2',
  'Tilled_Dirt_Wide', 'Tilled_Dirt_Wide_v2', 'Fences',
  'Wood_Bridge', 'Basic_Grass_Biom_things_1',
  ...MBTI_TYPES,
]

export const INDOOR_SCENE_KEYS = ['indoor', 'Wooden_House', 'Basic_Furniture', 'Chest']

export const GAME_ASSET_BY_KEY = Object.fromEntries(GAME_ASSETS.map((a) => [a.key, a]))
