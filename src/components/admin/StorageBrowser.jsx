import { useEffect, useState } from 'react'
import { cloudAsset } from '../../utils/cloudAsset'
import { listFlat } from '../../utils/storageOps'
import Popup from '../ui/Popup'

// Modal that lists files under one or more Storage folders and returns the
// chosen object's full path via onPick. Used to "Browse" existing assets when
// replacing a map's tilesets, the map JSON, or a character sprite.
export default function StorageBrowser({ folders, title = 'เลือกไฟล์จาก Storage', onPick, onClose }) {
  const [items, setItems]     = useState(null) // null = loading
  const [error, setError]     = useState(null)
  const [thumbs, setThumbs]   = useState({})   // fullPath -> url

  useEffect(() => {
    let cancelled = false
    Promise.all(
      folders.map((f) =>
        listFlat(f).then((entries) => entries.map((e) => e.path)),
      ),
    ).then((lists) => {
      if (cancelled) return
      const all = [...new Set(lists.flat())].sort()
      setItems(all)
      if (all.length === 0) setError('ไม่พบไฟล์ในโฟลเดอร์นี้')
      // Best-effort thumbnails for images.
      all.forEach((path) => {
        if (!/\.(png|jpe?g|gif|webp)$/i.test(path)) return
        cloudAsset(path, { fallback: null }).then((url) => {
          if (!cancelled && url) setThumbs((p) => ({ ...p, [path]: url }))
        })
      })
    })
    return () => { cancelled = true }
  }, [folders])

  return (
    <Popup variant="center" size="lg" maxHeight="max-h-[80vh]" onClose={onClose}>
      <div className="w-full flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-800">{title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="p-5 overflow-y-auto">
          {items === null ? (
            <p className="text-gray-400 text-sm animate-pulse">กำลังโหลด...</p>
          ) : error ? (
            <p className="text-gray-400 text-sm">{error}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((path) => (
                <button
                  key={path}
                  onClick={() => onPick(path)}
                  className="flex flex-col items-center gap-2 p-3 neo-card hover:bg-brand/5 transition-colors text-left"
                >
                  {thumbs[path] ? (
                    <img
                      src={thumbs[path]}
                      alt={path}
                      className="h-16 w-16 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center text-gray-300 text-xs">
                      {/\.json$/i.test(path) ? 'JSON' : '—'}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-600 break-all w-full">{path}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Popup>
  )
}
