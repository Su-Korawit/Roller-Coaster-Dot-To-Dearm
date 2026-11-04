import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDownloadURL } from 'firebase/storage'
import { X, Upload, Loader } from 'lucide-react'
import { listFlat, uploadAsset } from '../../utils/storageOps'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { registerBagItem } from '../../services/fileBag'

// Asset picker for a Video block: previously uploaded roadmap videos and a
// fresh upload. Unlike ImagePickerModal there is no "App images" tab (no
// app-provided video equivalent to a profile photo/university logo), and
// picking a video REPLACES data.url and closes the modal — a Video block
// holds exactly one video, not an album, so there's nothing to keep the
// modal open for.
export default function VideoPickerModal({ nodeId, onClose }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!uid) return
    let alive = true
    listFlat(`users/${uid}/roadmap-video/`)
      .then((entries) => Promise.all(entries.map(({ ref }) => getDownloadURL(ref))))
      .then((urls) => { if (alive) setUploads(urls) })
      .catch(() => { if (alive) setUploads([]) })
    return () => { alive = false }
  }, [uid])

  const pick = useCallback((url) => {
    updateNodeData(nodeId, { url })
    onClose()
  }, [nodeId, updateNodeData, onClose])

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploading(true)
    try {
      const storagePath = `users/${uid}/roadmap-video/${nodeId}-${Date.now()}`
      const url = await uploadAsset(storagePath, file, { contentType: file.type })
      try {
        await registerBagItem({
          ownerUid: uid,
          storagePath,
          name: file.name || 'video',
          kind: 'video',
          source: 'roadmap-video',
          sizeBytes: file.size ?? 0,
        })
      } catch (err) {
        console.warn('[fileBag] register roadmap video failed', err)
      }
      updateNodeData(nodeId, { url })
      onClose()
    } catch {
      setUploading(false)
      e.target.value = ''
    }
  }, [uid, nodeId, updateNodeData, onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm aspect-square max-h-[90vh] px-card flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rpg-plank px-4 py-3 flex items-center justify-between shrink-0">
          <p className="pixel-font text-xs font-bold text-ink">Choose video</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="px-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:bg-brand-soft hover:text-ink"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <Section title="My uploads">
            {uploads.length === 0
              ? <Empty>No uploads yet</Empty>
              : uploads.map((url) => <Thumb key={url} url={url} onClick={() => pick(url)} />)}
          </Section>

          <button
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand/40 text-brand hover:bg-brand/5 active:scale-95 transition-all"
          >
            {uploading
              ? <Loader size={18} className="animate-spin" />
              : <><Upload size={16} /><span className="pixel-font text-xs">Upload new</span></>}
          </button>
          <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={onFileChange} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="pixel-font text-xs text-ink-soft">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Thumb({ url, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="เลือกวิดีโอนี้"
      className="w-16 h-16 rounded-xl border-2 border-line/40 overflow-hidden hover:border-brand active:scale-95 transition-all relative bg-black"
    >
      <video src={url} className="w-full h-full object-cover pointer-events-none" muted />
    </button>
  )
}

function Empty({ children }) {
  return <span className="pixel-font text-xs text-ink-soft/50">{children}</span>
}
