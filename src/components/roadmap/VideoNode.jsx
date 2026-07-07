import { useState } from 'react'
import { Position } from '@xyflow/react'
import { Video as VideoIcon, Pencil, Maximize2 } from 'lucide-react'
import VideoPickerModal from './VideoPickerModal'
import MediaLightbox from './MediaLightbox'
import ConnectionDot from './ConnectionDot'

const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]

// Modeled on ImageNode.jsx's picker-trigger-when-empty + portal-modal
// pattern, but for a single video: no album (a node holds exactly one
// video) and no pan-to-reposition control (that only makes sense for a
// cover-filled image, not a <video> element).
export default function VideoNode({ id, data, selected }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const hasVideo = Boolean(data?.url)

  return (
    <div className="relative w-32 h-32">
      <div
        className={`w-full h-full rounded-xl border-2 bg-black overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
          selected ? 'border-ink shadow-hard-sm' : 'border-ink/30 shadow-none'
        }`}
        onClick={hasVideo ? undefined : () => setPickerOpen(true)}
        role="button"
        aria-label="Choose video"
      >
        {hasVideo ? (
          <video src={data.url} controls className="nodrag w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand/50">
            <VideoIcon size={28} strokeWidth={1.5} />
            <span className="pixel-font text-[10px] text-ink-soft">tap to choose</span>
          </div>
        )}
      </div>

      {hasVideo && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setPickerOpen(true)}
          aria-label="เปลี่ยนวิดีโอ"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <Pencil size={13} />
        </button>
      )}

      {hasVideo && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
          aria-label="ขยายวิดีโอ"
          className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-ink flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <Maximize2 size={13} />
        </button>
      )}

      {SIDES.map((pos) => (
        <ConnectionDot key={pos} id={pos} type="source" position={pos} />
      ))}

      {pickerOpen && <VideoPickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
      {lightboxOpen && (
        <MediaLightbox
          items={[{ type: 'video', url: data.url }]}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
