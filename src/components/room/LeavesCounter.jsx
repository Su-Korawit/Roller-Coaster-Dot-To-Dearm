import { useLeavesStore } from '../../stores/useLeavesStore'
import iconAtlas from '../../../public/assets/rc/icons.json'

const ICON = 20
const leafRow = iconAtlas.sprites.leaf.row

// The student's Leaves balance for the top bar. The leaf icon is one row of the generated icon sheet.
export default function LeavesCounter() {
  const leaves = useLeavesStore((s) => s.leaves)
  return (
    <span className="pixel-font text-xs text-ink flex items-center gap-1" aria-label={`ใบไม้ ${leaves} ใบ`}>
      <span
        aria-hidden="true"
        style={{
          width: ICON,
          height: ICON,
          backgroundImage: 'url(/assets/rc/icons.png)',
          backgroundPosition: `0 -${leafRow * ICON}px`,
          imageRendering: 'pixelated',
        }}
      />
      {leaves.toLocaleString('en-US')}
    </span>
  )
}
