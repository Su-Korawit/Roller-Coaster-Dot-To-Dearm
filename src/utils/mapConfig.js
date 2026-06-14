import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

// Per-map runtime config the game needs but the Tiled JSON can't carry reliably:
//   tilesets  — Tiled tileset name → Storage path of its image (the JSON's own
//               `image` paths are author-machine absolute paths, so unusable).
//   collision — layer name → true when that layer blocks the player.
//   hidden    — layer name → true to force-hide (e.g. an invisible collision mask
//               that Tiled left marked visible). Rendering also respects the JSON's
//               own `visible` flag, so layers hidden there need no entry here.
//
// Stored in Firestore `mapConfigs/{key}`. DEFAULT_MAP_CONFIGS reproduces the
// previously-hardcoded behavior so the game is unchanged until an admin edits it.

export const DEFAULT_MAP_CONFIGS = {
  test3: {
    tilesets: {
      'Grass':                     'sprites/tilesets/Grass.png',
      'Water':                     'sprites/tilesets/Water.png',
      'Wooden House':              'sprites/tilesets/Wooden_House.png',
      'Wooden_House_Walls_Tilset': 'sprites/tilesets/Wooden_House_Walls_Tilset.png',
      'Wooden_House_Roof_Tilset':  'sprites/tilesets/Wooden_House_Roof_Tilset.png',
      'Hills':                     'sprites/tilesets/Hills.png',
      'Tilled Dirt':               'sprites/tilesets/Tilled_Dirt.png',
      'Tilled_Dirt_v2':            'sprites/tilesets/Tilled_Dirt_v2.png',
      'Tilled_Dirt_Wide':          'sprites/tilesets/Tilled_Dirt_Wide.png',
      'Tilled_Dirt_Wide_v2':       'sprites/tilesets/Tilled_Dirt_Wide_v2.png',
      'Wood_Bridge':               'sprites/objects/Wood_Bridge.png',
      'Basic Grass Biom things 1': 'sprites/objects/Basic_Grass_Biom_things_1.png',
      'Fences':                    'sprites/tilesets/Fences.png',
    },
    collision: { 'Water': true, 'Hill/Wall': true, 'Object': true },
    hidden: {},
  },
  indoor: {
    tilesets: {
      'Basic_Furniture': 'sprites/objects/Basic_Furniture.png',
      'Wooden_House':    'sprites/tilesets/Wooden_House.png',
      'Chest':           'sprites/objects/Chest.png',
    },
    collision: { 'Collision': true },
    hidden: { 'Collision': true },
  },
}

const cfgRef = (key) => doc(db, 'mapConfigs', key)

// Returns the stored config for a map, or its built-in default. Falls back to the
// default on any read error so the game still boots offline / before first save.
export async function getMapConfig(key) {
  const fallback = DEFAULT_MAP_CONFIGS[key] ?? { tilesets: {}, collision: {}, hidden: {} }
  try {
    const snap = await getDoc(cfgRef(key))
    if (!snap.exists()) return fallback
    const d = snap.data()
    return {
      tilesets: d.tilesets ?? fallback.tilesets,
      collision: d.collision ?? {},
      hidden: d.hidden ?? {},
    }
  } catch {
    return fallback
  }
}

export async function saveMapConfig(key, { tilesets, collision, hidden }, uid) {
  await setDoc(
    cfgRef(key),
    { tilesets, collision, hidden, updatedAt: serverTimestamp(), updatedBy: uid ?? null },
    { merge: true },
  )
}
