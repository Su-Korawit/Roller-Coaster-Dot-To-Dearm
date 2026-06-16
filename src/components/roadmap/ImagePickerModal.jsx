import { useCallback, useEffect, useRef, useState } from 'react'
import { ref, listAll, getDownloadURL, uploadBytes } from 'firebase/storage'
import { X, Upload, Loader } from 'lucide-react'
import { storage } from '../../firebase'
import { tcasLogoUrl } from '../../hooks/useMytcas'
import { useAuthStore } from '../../stores/useAuthStore'
import { useUserStore } from '../../stores/useUserStore'
import { useSelectStore } from '../../stores/useSelectStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

// Asset picker for an image block: previously uploaded roadmap images,
// app assets (profile photo + selected university logo), and a fresh upload.
export default function ImagePickerModal({ nodeId, onClose }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const profilePhotoURL = useUserStore((s) => s.profilePhotoURL)
  const university = useSelectStore((s) => s.university)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)

  const [uploads, setUploads] = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  // Load previously uploaded roadmap images.
  useEffect(() => {
    if (!uid) return
    let alive = true
    listAll(ref(storage, `users/${uid}/roadmap/`))
      .then((res) => Promise.all(res.items.map((item) => getDownloadURL(item))))
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
      const storageRef = ref(storage, `users/${uid}/roadmap/${nodeId}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const url = await getDownloadURL(storageRef)
      updateNodeData(nodeId, { url })
      onClose()
    } catch {
      setUploading(false)
      e.target.value = ''
    }
  }, [uid, nodeId, updateNodeData, onClose])

  const appImages = [
    profilePhotoURL && { url: profilePhotoURL, label: 'Profile' },
    university && { url: tcasLogoUrl(university), label: 'University' },
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <p className="pixel-font text-[11px] font-bold text-gray-800">Choose image</p>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* My uploads */}
          <Section title="My uploads">
            {uploads.length === 0
              ? <Empty>No uploads yet</Empty>
              : uploads.map((url) => <Thumb key={url} url={url} onClick={() => pick(url)} />)}
          </Section>

          {/* App images */}
          <Section title="App images">
            {appImages.length === 0
              ? <Empty>None available</Empty>
              : appImages.map((img) => <Thumb key={img.url} url={img.url} label={img.label} onClick={() => pick(img.url)} />)}
          </Section>

          {/* Upload new */}
          <button
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-brand/40 text-brand hover:bg-brand/5 active:scale-95 transition-all"
          >
            {uploading
              ? <Loader size={18} className="animate-spin" />
              : <><Upload size={16} /><span className="pixel-font text-[10px]">Upload new</span></>}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="pixel-font text-[9px] text-gray-400">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Thumb({ url, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-16 h-16 rounded-xl border-2 border-gray-100 overflow-hidden hover:border-brand active:scale-95 transition-all relative"
    >
      <img src={url} alt={label ?? 'image'} className="w-full h-full object-contain p-1" draggable={false} />
      {label && (
        <span className="absolute bottom-0 inset-x-0 bg-white/80 pixel-font text-[6px] text-gray-500 text-center">{label}</span>
      )}
    </button>
  )
}

function Empty({ children }) {
  return <span className="pixel-font text-[8px] text-gray-300">{children}</span>
}
