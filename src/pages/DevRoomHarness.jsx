import { lazy, Suspense } from 'react'
import RoomLayer from '../components/room/RoomLayer'
import { useRoomStore } from '../stores/useRoomStore'
import { useLeavesStore } from '../stores/useLeavesStore'
import { useRoomUiStore } from '../stores/useRoomUiStore'
import { useFocusStore } from '../stores/useFocusStore'
import { ROOM_CATALOG } from '../data/roomCatalogSeed'
const GameCanvas = lazy(() => import('../components/GameCanvas'))
window.__dev = { useRoomStore, useLeavesStore, useRoomUiStore, useFocusStore, ROOM_CATALOG }
export default function DevRoomHarness() {
  return (
    <div className="relative h-dvh w-full">
      <Suspense fallback={null}><GameCanvas entryMapKey="room" /></Suspense>
      <RoomLayer />
    </div>
  )
}
