import { useState } from 'react'
import { Plus, Share2, Pencil, Trash2 } from 'lucide-react'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { createSheetAndSync, switchSheetAndSync, renameSheetAndSync, deleteSheetAndSync } from '../../services/roadmapSheets'
import ShareSheetModal from './ShareSheetModal'

export default function SheetSwitcher() {
  const sheets = useRoadmapStore((s) => s.sheets)
  const activeSheetId = useRoadmapStore((s) => s.activeSheetId)
  const [shareTarget, setShareTarget] = useState(null)

  const activeSheet = sheets.find((s) => s.id === activeSheetId)
  const canEdit = activeSheet?.myRole !== 'view'

  const handleCreate = async () => {
    const name = window.prompt('New sheet name', `Sheet ${sheets.length + 1}`)
    if (name?.trim()) await createSheetAndSync(name.trim())
  }

  const handleRename = async (sheet) => {
    const name = window.prompt('Rename sheet', sheet.name)
    if (name?.trim() && name.trim() !== sheet.name) {
      await renameSheetAndSync(sheet.id, name.trim())
    }
  }

  const handleDelete = async (sheet) => {
    if (sheets.length <= 1) return
    if (window.confirm(`Delete "${sheet.name}"? This cannot be undone.`)) {
      await deleteSheetAndSync(sheet.id)
    }
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      {sheets.map((sheet) => (
        <button
          key={sheet.id}
          onClick={() => switchSheetAndSync(sheet.id)}
          onDoubleClick={() => sheet.myRole === 'owner' && handleRename(sheet)}
          className={[
            'pixel-font text-[9px] px-3 py-1.5 rounded-full whitespace-nowrap transition-all active:scale-95',
            sheet.id === activeSheetId ? 'bg-brand text-white' : 'bg-brand/10 text-ink hover:bg-brand/20',
          ].join(' ')}
          aria-current={sheet.id === activeSheetId}
        >
          {sheet.name}
          {sheet.myRole && sheet.myRole !== 'owner' && <span className="ml-1 opacity-60">({sheet.myRole})</span>}
        </button>
      ))}

      {canEdit && (
        <button onClick={handleCreate} aria-label="New sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-brand hover:bg-brand/10 active:scale-95 transition-all">
          <Plus size={14} strokeWidth={2.5} />
        </button>
      )}

      {activeSheet?.myRole === 'owner' && (
        <>
          <button onClick={() => handleRename(activeSheet)} aria-label="Rename sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-95 transition-all">
            <Pencil size={13} strokeWidth={2.5} />
          </button>
          <button onClick={() => setShareTarget(activeSheet.id)} aria-label="Share sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-95 transition-all">
            <Share2 size={13} strokeWidth={2.5} />
          </button>
          {sheets.length > 1 && (
            <button onClick={() => handleDelete(activeSheet)} aria-label="Delete sheet" className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 active:scale-95 transition-all">
              <Trash2 size={13} strokeWidth={2.5} />
            </button>
          )}
        </>
      )}

      {shareTarget && <ShareSheetModal sheetId={shareTarget} onClose={() => setShareTarget(null)} />}
      {!canEdit && <span className="pixel-font text-[8px] text-gray-400 ml-1">View only</span>}
    </div>
  )
}
