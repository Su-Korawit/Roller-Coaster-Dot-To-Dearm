import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, ExternalLink, FileText, Loader } from 'lucide-react'
import { fileExt } from './FileNode'

// Full-screen file viewer, portalled to document.body for the same
// transformed-viewport reason as MediaLightbox. PDFs render inline via an
// <iframe> pointing at the Firebase download URL (alt=media serves
// Content-Type: application/pdf, which browsers display natively). Other
// types show a fallback card. Download fetches the object into a Blob so the
// anchor's `download` attribute works cross-origin (the firebasestorage
// endpoint sends permissive CORS headers for GET).
export default function FileViewerModal({ url, name, onClose }) {
  const [downloading, setDownloading] = useState(false)
  const isPdf = fileExt(name) === 'PDF'

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const download = async (e) => {
    e.stopPropagation()
    setDownloading(true)
    try {
      const blob = await (await fetch(url)).blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = name
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(url, '_blank', 'noopener') // fallback: let the browser handle it
    } finally {
      setDownloading(false)
    }
  }

  return createPortal(
    <div
      data-testid="file-viewer-backdrop"
      className="fixed inset-0 z-[60] bg-black/80 flex flex-col"
      onClick={onClose}
    >
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-3 rpg-plank"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText size={16} className="text-brand shrink-0" />
        <span className="pixel-font text-xs text-ink font-bold truncate flex-1">{name}</span>
        <button
          type="button"
          onClick={download}
          aria-label="ดาวน์โหลดไฟล์"
          className="px-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-brand"
        >
          {downloading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="เปิดในแท็บใหม่"
          className="px-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-brand"
        >
          <ExternalLink size={16} />
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="px-btn w-9 h-9 rounded-lg flex items-center justify-center text-ink-soft hover:text-ink"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={url} title={name} className="w-full h-full bg-white" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <FileText size={48} strokeWidth={1.5} className="text-white/50" />
            <p className="pixel-font text-xs text-white">ไฟล์ {fileExt(name)} ยังไม่รองรับการเปิดดูในแอป</p>
            <p className="pixel-font text-xs text-white/60">กด Download หรือเปิดในแท็บใหม่แทน</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
