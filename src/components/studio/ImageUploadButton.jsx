import { useRef, useState } from 'react'
import { uploadArticleImage, ImageError } from '../../services/articleImages'

const ERRORS = {
  not_image: 'ไฟล์นี้ไม่ใช่รูปภาพ',
  too_large: 'รูปใหญ่เกิน 5 MB',
}

// A button that opens the file picker, uploads the chosen image for this draft and
// hands back its URL.
export default function ImageUploadButton({ draftId, label, onUploaded, className = '' }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await uploadArticleImage(draftId, file)
      onUploaded(url)
    } catch (err) {
      setError(err instanceof ImageError ? ERRORS[err.code] ?? 'อัปโหลดรูปไม่สำเร็จ' : 'อัปโหลดรูปไม่สำเร็จ')
      if (!(err instanceof ImageError)) console.error('[studio] image upload failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-label={label}
        disabled={busy}
        onClick={() => input.current?.click()}
        className={className}
      >
        {busy ? 'กำลังอัปโหลด…' : label}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={onPick} data-testid="image-input" />
      {error && <span role="alert" className="text-xs text-ink mt-1">{error}</span>}
    </span>
  )
}
