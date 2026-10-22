// What the Guide needs to know about the student right now, read from the stores it must not
// import itself (see useGuideStore). Pure reading; nothing is written here.
import { useAuthStore } from '../stores/useAuthStore'
import { useLeavesStore } from '../stores/useLeavesStore'
import { useRoomStore } from '../stores/useRoomStore'
import { STARTER_ITEMS } from '../data/roomCatalogSeed'
import { STARTER_LAYOUT } from '../room/defaultLayout'
import { availablePlaces } from '../constants/warpPlaces'
import { DEFAULT_MAP_CONFIGS } from '../utils/mapConfig'

const PLACEABLE = ['furniture', 'desk', 'decor', 'wall']

export function buildGuideContext() {
  const signedIn = !!useAuthStore.getState().user
  const { leaves, inventory, practiceDone } = useLeavesStore.getState()
  const { catalog, layout } = useRoomStore.getState()

  const hasPurchased = Object.entries(inventory).some(([id, n]) => Number(n) > Number(STARTER_ITEMS[id] ?? 0))
  const prices = Object.values(catalog)
    .filter((it) => !it.hidden && PLACEABLE.includes(it.kind))
    .map((it) => Number(it.price))
    .filter(Number.isFinite)
  const canAffordSomething = prices.length > 0 && leaves >= Math.min(...prices)
  const placedCount = (id) => layout.placed.filter((p) => p.itemId === id).length
  const hasUnplacedItem = Object.entries(inventory).some(([id, n]) => PLACEABLE.includes(catalog[id]?.kind) && Number(n) > placedCount(id))
  const hasCustomRoom = layout.placed.some((p) => !STARTER_LAYOUT.placed.some((s) => s.itemId === p.itemId))
  const places = availablePlaces({ hasMap: (k) => k in DEFAULT_MAP_CONFIGS, signedIn }).length

  return { signedIn, practiceDone, hasPurchased, canAffordSomething, hasUnplacedItem, hasCustomRoom, places }
}
