import { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ImageIcon } from 'lucide-react'
import ImagePickerModal from './ImagePickerModal'

// Decorative connection points on all four sides — used to snap the image
// adjacent to flow blocks (lineless, like every other connection).
const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]

export default function ImageNode({ id, data, selected }) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="relative w-32 h-32">
      <div
        className={`w-full h-full rounded-2xl border-2 bg-white shadow-md overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
          selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'
        }`}
        onClick={() => setPickerOpen(true)}
        role="button"
        aria-label="Choose image"
      >
        {data.url ? (
          <img src={data.url} alt="" className="w-full h-full object-contain p-1" draggable={false} />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand/50">
            <ImageIcon size={28} strokeWidth={1.5} />
            <span className="pixel-font text-[7px] text-gray-300">tap to choose</span>
          </div>
        )}
      </div>

      {SIDES.map((pos) => (
        <Handle
          key={pos}
          id={pos}
          type="source"
          position={pos}
          className="!w-2.5 !h-2.5 !bg-brand !border-white !border-2"
        />
      ))}

      {pickerOpen && <ImagePickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
