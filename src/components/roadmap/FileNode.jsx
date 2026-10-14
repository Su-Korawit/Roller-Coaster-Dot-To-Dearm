import { useState } from 'react'
import { Position } from '@xyflow/react'
import { FileText, Pencil, Maximize2 } from 'lucide-react'
import FilePickerModal from './FilePickerModal'
import FileViewerModal from './FileViewerModal'
import ConnectionDot from './ConnectionDot'

const SIDES = [Position.Top, Position.Bottom, Position.Left, Position.Right]

// Extension badge, e.g. 'answer-key.pdf' -> 'PDF'. Files with no dot get 'FILE'.
export function fileExt(name) {
  const i = (name ?? '').lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toUpperCase() : 'FILE'
}

// Modeled on VideoNode.jsx: one file per block, picker-on-empty, portal
// modals. The block never embeds the document — it shows name + type and
// opens FileViewerModal for reading/downloading.
export default function FileNode({ id, data, selected }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const hasFile = Boolean(data?.url)

  return (
    <div className="relative w-32 h-32">
      <div
        className={`w-full h-full rounded-xl border-2 bg-surface overflow-hidden flex flex-col items-center justify-center gap-1 p-2 transition-all cursor-pointer ${
          selected ? 'border-edge shadow-hard-sm ring-2 ring-lime' : 'border-edge/60 shadow-hard-sm'
        }`}
        onClick={() => (hasFile ? setViewerOpen(true) : setPickerOpen(true))}
        role="button"
        aria-label={hasFile ? 'เปิดไฟล์' : 'Choose file'}
      >
        <FileText size={28} strokeWidth={1.5} className={hasFile ? 'text-brand' : 'text-brand/50'} />
        {hasFile ? (
          <>
            <span className="pixel-font text-[9px] text-ink text-center break-all leading-tight line-clamp-2">{data.name}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-brand/10 border border-brand/30 pixel-font text-[8px] text-brand">{fileExt(data.name)}</span>
          </>
        ) : (
          <span className="pixel-font text-[10px] text-ink-soft">tap to choose</span>
        )}
      </div>

      {hasFile && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setPickerOpen(true) }}
          aria-label="เปลี่ยนไฟล์"
          className="nodrag absolute top-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-edge flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <Pencil size={13} />
        </button>
      )}

      {hasFile && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setViewerOpen(true) }}
          aria-label="เปิดไฟล์"
          className="nodrag absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-surface border-2 border-edge flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <Maximize2 size={13} />
        </button>
      )}

      {SIDES.map((pos) => (
        <ConnectionDot key={pos} id={pos} type="source" position={pos} />
      ))}

      {pickerOpen && <FilePickerModal nodeId={id} onClose={() => setPickerOpen(false)} />}
      {viewerOpen && <FileViewerModal url={data.url} name={data.name} onClose={() => setViewerOpen(false)} />}
    </div>
  )
}
