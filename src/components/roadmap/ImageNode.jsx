import { useCallback, useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { ImageIcon, Loader } from 'lucide-react'
import { storage } from '../../firebase'
import { useAuthStore } from '../../stores/useAuthStore'
import { useRoadmapStore } from '../../stores/useRoadmapStore'

export default function ImageNode({ id, data, selected }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData)
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uid) return
    setUploading(true)
    setError(null)
    try {
      const storageRef = ref(storage, `users/${uid}/roadmap/${id}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const url = await getDownloadURL(storageRef)
      updateNodeData(id, { url })
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      // Reset so the same file can be re-picked after an error
      e.target.value = ''
    }
  }, [id, uid, updateNodeData])

  return (
    <div
      className={`w-28 h-28 rounded-2xl border-2 bg-white shadow-md overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
        selected ? 'border-brand shadow-brand/30 shadow-lg' : 'border-brand/40'
      }`}
      onClick={() => !uploading && inputRef.current?.click()}
      role="button"
      aria-label="Upload image"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {uploading ? (
        <Loader size={24} className="text-brand animate-spin" />
      ) : data.url ? (
        <img
          src={data.url}
          alt="uploaded"
          className="w-full h-full object-contain p-1"
          draggable={false}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-brand/50">
          <ImageIcon size={28} strokeWidth={1.5} />
          {error
            ? <span className="pixel-font text-[7px] text-red-400 text-center px-1">{error}</span>
            : <span className="pixel-font text-[7px] text-gray-300">tap to upload</span>
          }
        </div>
      )}
    </div>
  )
}
