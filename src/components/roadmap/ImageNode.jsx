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
        className={`w-full h-full rounded-xl border-2 bg-surface overflow-hidden flex items-center justify-center transition-all ${
          panning ? 'nodrag cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${selected ? 'border-ink shadow-hard-sm' : 'border-ink/30 shadow-none'}`}
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
            <span className="pixel-font text-[10px] text-ink-soft">tap to choose</span>
          </div>
        )}
      </div>

      {hasImage && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setPickerOpen(true)}
          aria-label="เพิ่ม/เปลี่ยนรูป"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
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
          className="nodrag absolute top-1 left-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-danger"
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
          className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
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
            className="nodrag absolute left-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={goToIndex(1)}
            aria-label="รูปถัดไป"
            className="nodrag absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
          >
            <ChevronRight size={12} />
          </button>
          <span className="nodrag absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-surface border-2 border-ink pixel-font text-[10px] text-ink-soft">
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
