import { Panel } from '@xyflow/react'
import { MousePointer2 } from 'lucide-react'
import SelectionActionBar from './SelectionActionBar'

/**
 * Shared React Flow toolbar for the student Roadmap and the admin IR Board.
 *
 * Renders: optional expandable block palette (top), optional wireframe tools
 * (bottom: Text / Line / Sticker / +), mobile select-mode toggle, and
 * SelectionActionBar. Parents own all state and handlers — this component is
 * presentational plus local-only scroll styling on the palette strip.
 */
export default function RoadmapToolbar({
  visible = true,
  showPalette = false,
  paletteItems = [],
  onAddType,
  getHandlers,
  mobileSelectMode = false,
  onToggleSelectMode,
  /** When set, renders the Roadmap-only Text · Line · Sticker · + strip. */
  wireframe = null,
  selectionCount = 0,
  onDuplicate,
  onExport,
  onDelete,
  onCancel,
  paletteExtra = null,
}) {
  if (!visible) return null

  const paletteOpen = wireframe ? showPalette : true

  return (
    <>
      {paletteOpen && paletteItems.length > 0 && (
        <Panel position="top-center">
          <div
            className="flex items-center gap-2 bg-white rounded-2xl shadow-hard-sm px-3 py-2 border border-ink/10 mt-2 max-w-[calc(100vw-1rem)] overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <span className="pixel-font text-[9px] text-ink-soft mr-1 flex-shrink-0">Add</span>
            {paletteItems.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => onAddType?.(item.type)}
                draggable={item.draggable !== false ? 'true' : undefined}
                onDragStart={
                  item.draggable === false
                    ? undefined
                    : (e) => e.dataTransfer.setData('application/roadmap-node-type', item.type)
                }
                {...(getHandlers && item.draggable !== false ? getHandlers(item.type) : {})}
                className={
                  item.buttonClassName ??
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex-shrink-0'
                }
                aria-label={item.ariaLabel ?? `Add ${item.label} block`}
              >
                {item.preview}
                <span className="pixel-font text-[8px] text-ink">{item.label}</span>
              </button>
            ))}
            {onToggleSelectMode && (
              <button
                type="button"
                onClick={onToggleSelectMode}
                className={[
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl active:scale-95 transition-all flex-shrink-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden',
                  mobileSelectMode ? 'bg-brand/20 hover:bg-brand/30' : 'hover:bg-brand/10',
                ].join(' ')}
                aria-label={mobileSelectMode ? 'Exit select mode' : 'Enter select mode'}
                aria-pressed={mobileSelectMode}
              >
                <MousePointer2
                  size={16}
                  className={mobileSelectMode ? 'text-brand' : 'text-ink-soft'}
                  strokeWidth={2}
                />
                <span className="pixel-font text-[8px] text-ink">Select</span>
              </button>
            )}
            {paletteExtra}
          </div>
        </Panel>
      )}

      {wireframe && (
        <Panel position="bottom-center">
          <div className="flex items-center gap-2 bg-white rounded-2xl shadow-hard-sm px-3 py-2 border border-ink/10 mb-2">
            <button
              type="button"
              onClick={wireframe.onText}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="เพิ่มข้อความ"
            >
              <div className="w-8 h-5 rounded-full bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
                <span className="pixel-font text-[6px] text-brand">Aa</span>
              </div>
              <span className="pixel-font text-[8px] text-ink">Text</span>
            </button>
            <button
              type="button"
              onClick={wireframe.onToggleLine}
              className={[
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl active:scale-95 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                wireframe.lineMode ? 'bg-brand/20 hover:bg-brand/30' : 'hover:bg-brand/10',
              ].join(' ')}
              aria-label="โหมดเส้น"
              aria-pressed={wireframe.lineMode}
            >
              <div className="w-8 h-8 rounded-xl border-2 border-dashed border-brand/50 flex items-center justify-center">
                <span className="text-[14px]">〰️</span>
              </div>
              <span className="pixel-font text-[8px] text-ink">Line</span>
            </button>
            <button
              type="button"
              onClick={wireframe.onStickers}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-brand/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="เพิ่มสติกเกอร์"
            >
              <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
                <span className="text-[14px]">⭐</span>
              </div>
              <span className="pixel-font text-[8px] text-ink">Sticker</span>
            </button>
            <button
              type="button"
              onClick={wireframe.onTogglePalette}
              className={[
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl active:scale-95 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                showPalette ? 'bg-brand/20 hover:bg-brand/30' : 'hover:bg-brand/10',
              ].join(' ')}
              aria-label="เพิ่มบล็อก"
              aria-pressed={showPalette}
            >
              <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
                <span className="pixel-font text-[14px] text-brand font-bold">+</span>
              </div>
              <span className="pixel-font text-[8px] text-ink">+</span>
            </button>
          </div>
        </Panel>
      )}

      <Panel position="bottom-center">
        <SelectionActionBar
          count={selectionCount}
          onDuplicate={onDuplicate}
          onExport={onExport}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      </Panel>
    </>
  )
}

/** Default student-Roadmap block palette (pixel-identical previews). */
export const ROADMAP_PALETTE_ITEMS = [
  {
    type: 'process',
    label: 'Process',
    preview: <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />,
  },
  {
    type: 'condition',
    label: 'Condition',
    buttonClassName:
      'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-accent-pink/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-pink flex-shrink-0',
    preview: (
      <div
        className="w-8 h-8 rotate-45 bg-accent-pink/20 border-2 border-accent-pink/50"
        style={{ borderRadius: '6px' }}
      />
    ),
  },
  {
    type: 'image',
    label: 'Image',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
        <span className="text-[14px]">🖼️</span>
      </div>
    ),
  },
  {
    type: 'video',
    label: 'Video',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
        <span className="text-[14px]">🎬</span>
      </div>
    ),
  },
  {
    type: 'file',
    label: 'File',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
        <span className="text-[14px]">📄</span>
      </div>
    ),
  },
  {
    type: 'start',
    label: 'Start',
    draggable: false,
    buttonClassName:
      'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-good/10 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-good flex-shrink-0',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-good/20 border-2 border-good/50 flex items-center justify-center">
        <span className="text-[14px]">🚩</span>
      </div>
    ),
  },
]

/** IR Board palette — mirrors IdeaRequestSection's former chip types. */
export const IR_PALETTE_ITEMS = [
  {
    type: 'ideaRoot',
    label: 'Idea Root',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50 flex items-center justify-center">
        <span className="text-[12px]">💡</span>
      </div>
    ),
  },
  {
    type: 'process',
    label: 'Process',
    preview: <div className="w-8 h-8 rounded-xl bg-brand/20 border-2 border-brand/50" />,
  },
  {
    type: 'image',
    label: 'Image',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-brand/10 border-2 border-brand/30 flex items-center justify-center">
        <span className="text-[14px]">🖼️</span>
      </div>
    ),
  },
  {
    type: 'update',
    label: 'Update',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-amber-100 border-2 border-amber-400/60 flex items-center justify-center">
        <span className="text-[12px]">📝</span>
      </div>
    ),
  },
  {
    type: 'success',
    label: 'Success',
    preview: (
      <div className="w-8 h-8 rounded-xl bg-good/20 border-2 border-good/50 flex items-center justify-center">
        <span className="text-[12px]">✅</span>
      </div>
    ),
  },
]
