import { useRef, useState } from 'react'

const ACCEPT = '.jpg,.jpeg,.png'

export default function SlipUploadButton({ onUpload, disabled }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(file)
    setPreview(url)
    onUpload(file)
    e.target.value = '' // allow re-selecting the same file
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={handleChange} disabled={disabled} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="neo-btn rpg-btn-primary pixel-font flex items-center gap-2 rounded-lg px-3 py-2 text-[9px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        📷 อัปโหลดสลิป
      </button>
      {preview && (
        <img src={preview} alt="Slip preview" className="h-24 w-24 rounded-lg border-2 border-edge object-cover" />
      )}
    </div>
  )
}
