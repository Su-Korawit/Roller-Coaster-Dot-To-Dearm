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
        className="pixel-font flex items-center gap-2 rounded-lg border-2 border-brand-strong bg-brand-strong px-3 py-2 text-[9px] text-white shadow-[2px_2px_0_0_#1a1035] transition-all hover:shadow-[3px_3px_0_0_#1a1035] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        📷 อัปโหลดสลิป
      </button>
      {preview && (
        <img src={preview} alt="Slip preview" className="h-24 w-24 rounded-lg border-2 border-brand object-cover" />
      )}
    </div>
  )
}
