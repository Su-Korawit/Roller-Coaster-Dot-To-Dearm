import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Globe, Copy } from 'lucide-react'
import { getDoc } from 'firebase/firestore'
import { useSocialStore } from '../../stores/useSocialStore'
import { refs } from '../../lib/db'
import { shareSheet, setSheetPublic, buildPublicShareUrl } from '../../services/roadmapSheets'

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
  const [publicState, setPublicState] = useState({ loading: true, isPublic: false, shareId: null })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    getDoc(refs.roadmapSheet(sheetId)).then((snap) => {
      if (!alive || !snap.exists()) return
      const data = snap.data()
      setPublicState({ loading: false, isPublic: Boolean(data.public), shareId: data.shareId ?? null })
    })
    return () => { alive = false }
  }, [sheetId])

  const togglePublic = async () => {
    const next = !publicState.isPublic
    setPublicState((s) => ({ ...s, loading: true }))
    const shareId = await setSheetPublic(sheetId, next)
    setPublicState({ loading: false, isPublic: next, shareId: shareId ?? publicState.shareId })
  }

  const copyLink = async () => {
    if (!publicState.shareId) return
    await navigator.clipboard.writeText(buildPublicShareUrl(publicState.shareId))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      <div className="w-full max-w-sm neo-card flex flex-col overflow-hidden max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="rpg-plank px-4 py-3 flex items-center justify-between shrink-0">
          <p className="pixel-font text-[11px] font-bold text-ink">Share sheet</p>
          <button onClick={onClose} aria-label="Close" className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:bg-brand-soft">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Public link — no account needed to view */}
        <div className="rpg-plank px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="pixel-font text-[10px] text-ink flex items-center gap-1.5">
              <Globe size={13} className="text-brand" /> Public link
            </span>
            <button
              type="button"
              onClick={togglePublic}
              disabled={publicState.loading}
              aria-pressed={publicState.isPublic}
              aria-label="Toggle public link"
              className={[
                'pixel-font text-[9px] px-3 py-1 rounded-full transition-all disabled:opacity-50',
                publicState.isPublic ? 'bg-brand text-white' : 'bg-brand/10 text-ink',
              ].join(' ')}
            >
              {publicState.isPublic ? 'On' : 'Off'}
            </button>
          </div>
          {publicState.isPublic && publicState.shareId && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={buildPublicShareUrl(publicState.shareId)}
                aria-label="Public share link"
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 text-[10px] px-2 py-1.5 rounded-lg border border-edge/50 bg-brand-soft/30 text-ink-soft truncate"
              />
              <button
                type="button"
                onClick={copyLink}
                aria-label="Copy link"
                className="neo-btn w-8 h-8 rounded-lg flex items-center justify-center text-ink-soft hover:text-brand shrink-0"
              >
                {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />}
              </button>
            </div>
          )}
          <p className="pixel-font text-[8px] text-ink-soft/70">Anyone with the link can view — they cannot edit.</p>
        </div>

        <div className="px-4 py-3 flex items-center gap-2 border-b-2 border-edge/30">
          <span className="pixel-font text-[10px] text-ink-soft">Access:</span>
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
          {pool.length === 0 && <span className="pixel-font text-[10px] text-ink-soft/50">Follow someone first to share with them.</span>}
          {pool.map((uid) => (
            <button
              key={uid}
              disabled={busy}
              onClick={() => handleShare(uid)}
              className="flex items-center justify-between px-3 py-2 rounded-xl border border-edge/40 hover:bg-brand/5 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="pixel-font text-[10px] text-ink">{requestUsers[uid]?.displayName ?? uid}</span>
              {sharedWith === uid && <Check size={14} className="text-good" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
