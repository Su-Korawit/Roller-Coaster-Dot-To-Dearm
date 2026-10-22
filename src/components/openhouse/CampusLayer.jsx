import { useEffect } from 'react'
import { useWorldStore } from '../../stores/useWorldStore'
import { useOpenHouseUiStore } from '../../stores/useOpenHouseUiStore'
import FacultyPopup from './FacultyPopup'
import DirectoryBoard from './DirectoryBoard'
import EnterBuildingButton from './EnterBuildingButton'
import Minimap from './Minimap'

// Everything the campus adds on top of the game canvas: minimap, the door action, the faculty popup
// and the directory board. Mounted by the guest page (`always`: it must show before the map has
// booted, e.g. for a deep link) and by the signed-in home screen, where it shows only while the
// campus is the current map and clears itself when the student warps away.
export default function CampusLayer({ always = false }) {
  const onCampus = useWorldStore((s) => s.currentMapKey === 'campus')
  const openBuildingId = useOpenHouseUiStore((s) => s.openBuildingId)
  const directoryOpen = useOpenHouseUiStore((s) => s.directoryOpen)
  const visible = always || onCampus

  useEffect(() => {
    if (!visible) useOpenHouseUiStore.getState().reset()
  }, [visible])

  if (!visible) return null
  return (
    <>
      <Minimap />
      <EnterBuildingButton />
      {openBuildingId && (
        <FacultyPopup key={openBuildingId} buildingId={openBuildingId} onClose={() => useOpenHouseUiStore.getState().closeBuilding()} />
      )}
      {directoryOpen && <DirectoryBoard onClose={() => useOpenHouseUiStore.getState().closeDirectory()} />}
    </>
  )
}
