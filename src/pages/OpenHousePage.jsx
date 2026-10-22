import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BUILDING_BY_ID } from '../constants/openHouseBuildings'
import { placementOf, doorTile, MAP } from '../game/campusLayout'
import { useOpenHouseUiStore } from '../stores/useOpenHouseUiStore'
import { useRoomUiStore } from '../stores/useRoomUiStore'
import { usePopupStore } from '../stores/usePopupStore'
import { usePlanUiStore } from '../stores/usePlanUiStore'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import FacultyPopup from '../components/openhouse/FacultyPopup'
import DirectoryBoard from '../components/openhouse/DirectoryBoard'
import EnterBuildingButton from '../components/openhouse/EnterBuildingButton'
import Minimap from '../components/openhouse/Minimap'
import GuestHotbar from '../components/openhouse/GuestHotbar'
import PlanSheet from '../components/plan/PlanSheet'
import RoundPickerSheet from '../components/plan/RoundPickerSheet'
import SettingsSheet from '../components/SettingsSheet'
import GuideOverlay from '../components/hotbar/GuideOverlay'

const GameCanvas = lazy(() => import('../components/GameCanvas'))

const TITLE = 'Open House — เดินดูคณะและเส้นทางเข้าทุกมหาลัย | I LOVE TCAS'

// A deep link (?b=med) stands the avatar in front of that building; unknown ids are ignored.
function spawnFor(buildingId) {
  const p = BUILDING_BY_ID[buildingId] && placementOf(buildingId)
  if (!p) return null
  const d = doorTile(p)
  return { x: (d.x + 1) * MAP.tile, y: d.y * MAP.tile + MAP.tile / 2 }
}

// /openhouse — the campus for anyone, no account needed. Mounts the game canvas pinned to the
// campus map plus the faculty UI; the plan sheet and its round picker are mounted here because
// RoomLayer (which normally owns them) belongs to the signed-in home screen.
export default function OpenHousePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  // Read once on first load: later URL edits are our own (see the effect below).
  const [{ deepLink, spawnAt }] = useState(() => {
    const id = params.get('b')
    const valid = BUILDING_BY_ID[id] ? id : null
    return { deepLink: valid, spawnAt: spawnFor(valid) }
  })

  const openBuildingId = useOpenHouseUiStore((s) => s.openBuildingId)
  const directoryOpen = useOpenHouseUiStore((s) => s.directoryOpen)
  const sheet = useRoomUiStore((s) => s.sheet)
  const popup = usePopupStore((s) => s.activePopup)
  const adding = usePlanUiStore((s) => s.adding)

  useDocumentTitle(TITLE)

  useEffect(() => {
    if (deepLink) useOpenHouseUiStore.getState().openBuilding(deepLink)
    return () => {
      useOpenHouseUiStore.getState().reset()
      useRoomUiStore.getState().close()
    }
  }, [deepLink])

  // Keep the address bar shareable: ?b=<id> while a faculty is open.
  useEffect(() => {
    const cur = params.get('b')
    if (openBuildingId && cur !== openBuildingId) setParams({ b: openBuildingId }, { replace: true })
    else if (!openBuildingId && cur) setParams({}, { replace: true })
  }, [openBuildingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const overlayOpen = !!openBuildingId || directoryOpen || !!sheet || !!popup || !!adding

  return (
    <div data-testid="openhouse-page" className="relative h-full w-full overflow-hidden bg-mist">
      <Suspense fallback={<div className="w-full h-full px-sky-bg" />}>
        <GameCanvas active={!overlayOpen} entryMapKey="campus" entrySpawnAt={spawnAt} />
      </Suspense>

      <Minimap />
      <EnterBuildingButton />
      <GuideOverlay />

      {openBuildingId && (
        <FacultyPopup key={openBuildingId} buildingId={openBuildingId} onClose={() => useOpenHouseUiStore.getState().closeBuilding()} />
      )}
      {directoryOpen && <DirectoryBoard onClose={() => useOpenHouseUiStore.getState().closeDirectory()} />}
      {sheet === 'plan' && <PlanSheet onClose={() => useRoomUiStore.getState().close()} />}
      {adding && <RoundPickerSheet program={adding} onClose={() => usePlanUiStore.getState().closeAdd()} />}
      {popup === 'settings' && <SettingsSheet onClose={() => usePopupStore.getState().close()} />}

      <GuestHotbar onSignIn={() => navigate('/auth')} />
    </div>
  )
}
