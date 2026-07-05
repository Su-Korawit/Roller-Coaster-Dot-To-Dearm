import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { stepAlbumIndex } from '../../utils/stepAlbumIndex'

// Full-screen viewer for an image album or a single video, shared by
// ImageNode and VideoNode. Portalled to document.body for the same reason as
// ImagePickerModal: the block lives inside React Flow's transformed
// viewport, where a `position: fixed` child would anchor to that transform
// (scaled/offset, unclickable) instead of the real screen.
//
// Navigation here is local-only — stepping through the album while the
// lightbox is open does not write back to the node's `activeIndex`, so
// re-opening the lightbox always starts from the thumbnail currently shown
// on the block.
export default function MediaLightbox({ items, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const current = items[index]

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && items.length > 1) setIndex((i) => stepAlbumIndex(i, -1, items.length))
      if (e.key === 'ArrowRight' && items.length > 1) setIndex((i) => stepAlbumIndex(i, 1, items.length))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items.length, onClose])

  if (!current) return null

  // Full-viewport on small screens (iPad/mobile); centered with max-width/
  // max-height constraints on desktop (sm: breakpoint, 640px+).
  const mediaClass = 'w-screen h-screen object-contain sm:w-auto sm:h-auto sm:max-w-[90vw] sm:max-h-[90vh]'

  return createPortal(
    <div
      data-testid="lightbox-backdrop"
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all z-10"
      >
        <X size={22} />
      </button>

      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => stepAlbumIndex(i, -1, items.length)) }}
          aria-label="ก่อนหน้า"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all z-10"
        >
          <ChevronLeft size={24} />
        </button>
      )}
      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIndex((i) => stepAlbumIndex(i, 1, items.length)) }}
          aria-label="ถัดไป"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all z-10"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
        {current.type === 'video' ? (
          <video data-testid="lightbox-media" src={current.url} controls autoPlay className={mediaClass} />
        ) : (
          <img data-testid="lightbox-media" src={current.url} alt="" draggable={false} className={mediaClass} />
        )}
      </div>
    </div>,
    document.body,
  )
}
