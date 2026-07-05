import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import { useSocialStore } from '../../stores/useSocialStore'
import { shareSheet } from '../../services/roadmapSheets'

export default function ShareSheetModal({ sheetId, onClose }) {
  const following = useSocialStore((s) => s.following)
  const followers = useSocialStore((s) => s.followers)
  const requestUsers = useSocialStore((s) => s.requestUsers)
  const hydrateRequestUsers = useSocialStore((s) => s.hydrateRequestUsers)

  const pool = useMemo(() => [...new Set([...following, ...followers])], [following, followers])

  useEffect(() => {
    const missing = pool.filter((uid) => !requestUsers[uid])
    if (missing.length > 0) hydrateRequestUsers(missing)
  }, [pool, requestUsers, hydrateRequestUsers])

  const [level, setLevel] = useState('view')
  const [sharedWith, setSharedWith] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleShare = async (targetUid) => {
    setBusy(true)
    try {
      await shareSheet(sheetId, targetUid, level)
      setSharedWith(targetUid)
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-lg shadow-xl flex flex-col overflow-hidden max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <p className="pixel-font text-[11px] font-bold text-gray-800">Share sheet</p>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-all">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
          <span className="pixel-font text-[9px] text-gray-400">Access:</span>
          {['view', 'edit'].map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={[
                'pixel-font text-[9px] px-3 py-1 rounded-full transition-all',
                level === lv ? 'bg-brand text-white' : 'bg-brand/10 text-ink',
              ].join(' ')}
            >
              {lv}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {pool.length === 0 && <span className="pixel-font text-[8px] text-gray-300">Follow someone first to share with them.</span>}
          {pool.map((uid) => (
            <button
              key={uid}
              disabled={busy}
              onClick={() => handleShare(uid)}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 hover:bg-brand/5 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="pixel-font text-[9px] text-ink">{requestUsers[uid]?.displayName ?? uid}</span>
              {sharedWith === uid && <Check size={14} className="text-green-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
