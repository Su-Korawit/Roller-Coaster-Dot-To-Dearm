import { useEffect } from 'react'
import { BUILDING_BY_ID } from '../../constants/openHouseBuildings'
import { useOpenHouseUiStore } from '../../stores/useOpenHouseUiStore'
import { Z_HUD } from '../../constants/zIndex'
import { HOTBAR_DOCK } from '../../constants/hotbarLayout'

const typing = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

// The "เข้าตึก" action: shown while the player stands in a door zone, never opens by itself.
// Tap, or press E / Enter on a keyboard. At the directory board the same slot opens the map.
export default function EnterBuildingButton() {
  const doorId = useOpenHouseUiStore((s) => s.doorBuildingId)
  const nearDirectory = useOpenHouseUiStore((s) => s.nearDirectory)
  const busy = useOpenHouseUiStore((s) => s.openBuildingId !== null || s.directoryOpen)

  const target = !busy && (doorId ? { label: `เข้าตึก${BUILDING_BY_ID[doorId].shortTh}`, go: () => useOpenHouseUiStore.getState().openBuilding(doorId) }
    : nearDirectory ? { label: 'ดูแผนที่มหาวิทยาลัย', go: () => useOpenHouseUiStore.getState().openDirectory() } : null)

  useEffect(() => {
    if (!target) return undefined
    const onKey = (e) => {
      if (typing(e.target) || e.repeat) return
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); target.go() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target?.label]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null
  return (
    <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ bottom: HOTBAR_DOCK, zIndex: Z_HUD }}>
      <button type="button" onClick={target.go} className="px-btn pointer-events-auto h-12 px-6 text-sm font-bold bg-leaf text-ink">
        {target.label}
        <span className="ml-2 text-xs text-ink-soft hidden md:inline" aria-hidden="true">E</span>
      </button>
    </div>
  )
}
