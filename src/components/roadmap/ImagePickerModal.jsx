import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDownloadURL } from 'firebase/storage'
import { X, Upload, Loader } from 'lucide-react'
import { listFlat } from '../../utils/storageOps'
import { uploadRoadmapImage } from '../../utils/uploadRoadmapImage'
import { tcasLogoUrl } from '../../hooks/useMytcas'
import { useAuthStore } from '../../stores/useAuthStore'
import { useUserStore } from '../../stores/useUserStore'
import { useSelectStore } from '../../stores/useSelectStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'
import { normalizeImageNodeData, DEFAULT_IMAGE_OFFSET } from '../../utils/normalizeImageNodeData'
import Popup from '../ui/Popup'

// Asset picker for an image block: previously uploaded roadmap images, app
// assets (profile photo + selected university logo), and a fresh upload.
// Selecting an image APPENDS it to the block's album (data.images) rather
// than replacing it — the modal stays open afterwards so the user can add
// several images in one sitting; they close it explicitly via the X button
// or a backdrop click when done.
export default function ImagePickerModal({ nodeId, onClose }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const profilePhotoURL = useUserStore((s) => s.profilePhotoURL)
  const university = useSelectStore((s) => s.university)
  const nodeData = useRoadmapStore((s) => s.nodes.find((n) => n.id === nodeId)?.data)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!uid) return
    let alive = true
    listFlat(`users/${uid}/roadmap/`)
      .then((entries) => Promise.all(entries.map(({ ref }) => getDownloadURL(ref))))
      .then((urls) => { if (alive) setUploads(urls) })
      .catch(() => { if (alive) setUploads([]) })
    return () => { alive = false }
  }, [uid])

  const appendImage = useCallback((url) => {
    const { images } = normalizeImageNodeData(nodeData)
    const nextImages = [...images, { url, offset: DEFAULT_IMAGE_OFFSET }]
    updateNodeData(nodeId, { images: nextImages, activeIndex: nextImages.length - 1 })
  }, [nodeData, nodeId, updateNodeData])

  const pick = useCallback((url) => {
    appendImage(url)
  }, [appendImage])

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploading(true)
    try {
      const url = await uploadRoadmapImage(uid, nodeId, file)
      appendImage(url)
    } catch {
      // swallow — the upload button below returns to its resting state
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [uid, nodeId, appendImage])

  const appImages = [
    profilePhotoURL && { url: profilePhotoURL, label: 'Profile' },
    university && { url: tcasLogoUrl(university), label: 'University' },
  ].filter(Boolean)

  return createPortal(
    <Popup variant="center" size="sm" onClose={onClose}>
      <div className="aspect-square max-h-[90vh] flex flex-col overflow-hidden">
        <div className="rpg-plank px-4 py-3 flex items-center justify-between shrink-0">
          <div>
            <p className="pixel-font text-xs font-bold text-ink">Choose image</p>
            <p className="pixel-font text-xs text-ink-soft mt-0.5">Tap to add — close when you're done</p>
          </div>
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

          <Section title="App images">
            {appImages.length === 0
              ? <Empty>None available</Empty>
              : appImages.map((img) => <Thumb key={img.url} url={img.url} label={img.label} onClick={() => pick(img.url)} />)}
          </Section>

          <button
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand/40 text-brand hover:bg-brand/5 active:scale-95 transition-all"
          >
            {uploading
              ? <Loader size={18} className="animate-spin" />
              : <><Upload size={16} /><span className="pixel-font text-xs">Upload new</span></>}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>
      </div>
    </Popup>,
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

function Thumb({ url, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-16 h-16 rounded-xl border-2 border-line/40 overflow-hidden hover:border-brand active:scale-95 transition-all relative"
    >
      <img src={url} alt={label ?? 'image'} className="w-full h-full object-contain p-1" draggable={false} />
      {label && (
        <span className="absolute bottom-0 inset-x-0 bg-paper/80 pixel-font text-xs text-ink-soft text-center">{label}</span>
      )}
    </button>
  )
}

function Empty({ children }) {
  return <span className="pixel-font text-xs text-ink-soft/50">{children}</span>
}
