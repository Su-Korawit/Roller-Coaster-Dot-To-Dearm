import { useRef, useState } from 'react'
import { Position } from '@xyflow/react'
import { ImageIcon, Pencil } from 'lucide-react'
import ImagePickerModal from './ImagePickerModal'
import ConnectionDot from './ConnectionDot'
import { computeImageOffset } from '../../utils/computeImageOffset'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Decorative connection points on all four sides — used to snap the image
// adjacent to flow blocks (lineless, like every other connection).
const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]
const DEFAULT_OFFSET = { x: 50, y: 50 }

export default function ImageNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Holds the last pointer position + the frame's screen size while panning.
  // Screen size (not the 128 world size) keeps the math correct under zoom.
  const dragRef = useRef(null)
  const colorInputRef = useRef(null)

  const offset = data.offset ?? DEFAULT_OFFSET
  const hasImage = Boolean(data.url)

  // Pan only when the block is selected; otherwise the pointer drag is left to
  // React Flow so the block moves around the canvas as usual.
  const panning = selected && hasImage

  const onPointerDown = (e) => {
    if (!panning) return
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const { x, y, w, h } = dragRef.current
    const delta = { dx: e.clientX - x, dy: e.clientY - y }
    dragRef.current = { ...dragRef.current, x: e.clientX, y: e.clientY }
    updateNodeData(id, { offset: computeImageOffset(offset, delta, { w, h }) })
  }
  const onPointerUp = (e) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const onColorChange = (e) => updateNodeData(id, { color: e.target.value })

  return (
    <div className="relative w-32 h-32">
      <div
        className={`w-full h-full rounded-2xl border-2 bg-white shadow-md overflow-hidden flex items-center justify-center transition-all ${
          panning ? 'nodrag cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'}`}
        style={data.color ? { borderColor: data.color } : undefined}
        onClick={hasImage ? undefined : () => setPickerOpen(true)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="button"
        aria-label="Choose image"
      >
        {hasImage ? (
          <img
            src={data.url}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: `${offset.x}% ${offset.y}%` }}
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand/50">
            <ImageIcon size={28} strokeWidth={1.5} />
            <span className="pixel-font text-[7px] text-gray-300">tap to choose</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => colorInputRef.current?.click()}
        aria-label="Choose block color"
        className="nodrag absolute top-1 left-1 w-5 h-5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: data.color ?? '#94a3b8' }}
      />
      <input
        ref={colorInputRef}
        type="color"
        value={data.color ?? '#94a3b8'}
        onChange={onColorChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Re-open the picker once an image is set; `nodrag` + stopPropagation keep
          this tap from being swallowed by canvas dragging or image panning. */}
      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setPickerOpen(true)}
          aria-label="เปลี่ยนรูป"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
        >
          <Pencil size={13} />
        </button>
      )}

      {SIDES.map((pos) => (
        <ConnectionDot key={pos} id={pos} type="source" position={pos} />
      ))}

      {pickerOpen && <ImagePickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
