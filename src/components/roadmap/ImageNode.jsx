import { useRef, useState } from 'react'
import { Position } from '@xyflow/react'
import { ImageIcon, Pencil, ChevronLeft, ChevronRight, Trash2, Maximize2 } from 'lucide-react'
import ImagePickerModal from './ImagePickerModal'
import MediaLightbox from './MediaLightbox'
import ConnectionDot from './ConnectionDot'
import { computeImageOffset } from '../../utils/computeImageOffset'
import { normalizeImageNodeData, DEFAULT_IMAGE_OFFSET } from '../../utils/normalizeImageNodeData'
import { stepAlbumIndex } from '../../utils/stepAlbumIndex'
import { removeAlbumImage } from '../../utils/removeAlbumImage'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Decorative connection points on all four sides — used to snap the image
// adjacent to flow blocks (lineless, like every other connection).
const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]

export default function ImageNode({ id, data, selected }) {
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const dragRef = useRef(null)
  const colorInputRef = useRef(null)

  const { images, activeIndex } = normalizeImageNodeData(data)
  const hasImage = images.length > 0
  const active = images[activeIndex]
  const offset = active?.offset ?? DEFAULT_IMAGE_OFFSET

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
    const nextOffset = computeImageOffset(offset, delta, { w, h })
    updateNodeData(id, {
      images: images.map((img, i) => (i === activeIndex ? { ...img, offset: nextOffset } : img)),
    })
  }
  const onPointerUp = (e) => {
    dragRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const onColorChange = (e) => updateNodeData(id, { color: e.target.value })

  const goToIndex = (delta) => (e) => {
    e.stopPropagation()
    updateNodeData(id, { activeIndex: stepAlbumIndex(activeIndex, delta, images.length) })
  }

  const removeActive = (e) => {
    e.stopPropagation()
    updateNodeData(id, removeAlbumImage(images, activeIndex, activeIndex))
  }

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
            data-testid="node-image"
            src={active.url}
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
        className="nodrag absolute top-8 left-1 w-5 h-5 rounded-full border-2 border-white shadow"
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

      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setPickerOpen(true)}
          aria-label="เพิ่ม/เปลี่ยนรูป"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
        >
          <Pencil size={13} />
        </button>
      )}

      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={removeActive}
          aria-label="ลบรูปนี้"
          className="nodrag absolute top-1 left-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-red-500 active:scale-95 transition-all"
        >
          <Trash2 size={13} />
        </button>
      )}

      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
          aria-label="ขยายรูป"
          className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
        >
          <Maximize2 size={13} />
        </button>
      )}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={goToIndex(-1)}
            aria-label="รูปก่อนหน้า"
            className="nodrag absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={goToIndex(1)}
            aria-label="รูปถัดไป"
            className="nodrag absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-500 hover:text-brand active:scale-95 transition-all"
          >
            <ChevronRight size={12} />
          </button>
          <span className="nodrag absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-white/90 shadow pixel-font text-[6px] text-gray-500">
            {activeIndex + 1}/{images.length}
          </span>
        </>
      )}

      {SIDES.map((pos) => (
        <ConnectionDot key={pos} id={pos} type="source" position={pos} />
      ))}

      {pickerOpen && <ImagePickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
      {lightboxOpen && (
        <MediaLightbox
          items={images.map((img) => ({ type: 'image', url: img.url }))}
          initialIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
