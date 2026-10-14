import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDownloadURL } from 'firebase/storage'
import { X, Upload, Loader, FileText } from 'lucide-react'
import { listFlat, uploadAsset } from '../../utils/storageOps'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { registerBagItem } from '../../services/fileBag'

const ACCEPT = '.pdf,.md,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx'

// Strips the `${nodeId}-${timestamp}-` upload prefix back off a Storage
// object name so the picker lists human filenames. Names uploaded elsewhere
// (no prefix) pass through unchanged.
export function displayName(objectName) {
  const m = /^node-[^-]*-\d+-\d+-(.+)$/.exec(objectName)
  return m ? m[1] : objectName
}

export default function FilePickerModal({ nodeId, onClose }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!uid) return
    let alive = true
    listFlat(`users/${uid}/roadmap-file/`)
      .then((entries) => Promise.all(entries.map(async ({ ref }) => ({
        url: await getDownloadURL(ref),
        name: displayName(ref.name),
      }))))
      .then((files) => { if (alive) setUploads(files) })
      .catch(() => { if (alive) setUploads([]) })
    return () => { alive = false }
  }, [uid])

  const pick = useCallback((file) => {
    updateNodeData(nodeId, { url: file.url, name: file.name })
    onClose()
  }, [nodeId, updateNodeData, onClose])

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploading(true)
    try {
      const storagePath = `users/${uid}/roadmap-file/${nodeId}-${Date.now()}-${file.name}`
      const url = await uploadAsset(
        storagePath,
        file,
        { contentType: file.type || 'application/octet-stream' },
      )
      try {
        await registerBagItem({
          ownerUid: uid,
          storagePath,
          name: file.name,
          kind: 'file',
          source: 'roadmap-file',
          sizeBytes: file.size ?? 0,
        })
      } catch (err) {
        console.warn('[fileBag] register roadmap file failed', err)
      }
      updateNodeData(nodeId, { url, name: file.name })
      onClose()
    } catch {
      setUploading(false)
      e.target.value = ''
    }
  }, [uid, nodeId, updateNodeData, onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm aspect-square max-h-[90vh] neo-card flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rpg-plank px-4 py-3 flex items-center justify-between shrink-0">
          <p className="pixel-font text-[11px] font-bold text-ink">Choose file</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="neo-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:bg-brand-soft hover:text-ink"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <Section title="My uploads">
            {uploads.length === 0
              ? <Empty>No uploads yet</Empty>
              : uploads.map((file) => <FileRow key={file.url} file={file} onClick={() => pick(file)} />)}
          </Section>

          <button
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand/40 text-brand hover:bg-brand/5 active:scale-95 transition-all"
          >
            {uploading
              ? <Loader size={18} className="animate-spin" />
              : <><Upload size={16} /><span className="pixel-font text-[10px]">Upload new</span></>}
          </button>
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="pixel-font text-[10px] text-ink-soft">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FileRow({ file, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={`เลือก ${file.name}`}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-edge/40 hover:border-brand active:scale-95 transition-all w-full text-left"
    >
      <FileText size={14} className="text-brand shrink-0" />
      <span className="pixel-font text-[10px] text-ink truncate">{file.name}</span>
    </button>
  )
}

function Empty({ children }) {
  return <span className="pixel-font text-[10px] text-ink-soft/50">{children}</span>
}
