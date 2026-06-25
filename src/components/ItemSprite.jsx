import { useState, useEffect } from 'react'
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'
import { useFarmDataStore } from '../stores/useFarmDataStore'

const SHEET_COLS = 6
const SHEET_ROWS = 2
const FRAME_PX = 16
let _cachedUrl = null

export function ItemSprite({ itemId, size = 40 }) {
  const [imgUrl, setImgUrl] = useState(_cachedUrl)
  const iconIndex = useFarmDataStore((s) => s.items[itemId]?.iconIndex ?? null)

  useEffect(() => {
    if (_cachedUrl) { setImgUrl(_cachedUrl); return }
    getDownloadURL(ref(storage, 'sprites/objects/Basic_Plants.png'))
      .then((url) => { _cachedUrl = url; setImgUrl(url) })
      .catch(() => {
        _cachedUrl = '/assets/sprites/Objects/Basic_Plants.png'
        setImgUrl(_cachedUrl)
      })
  }, [])

  if (iconIndex === null || !imgUrl) return <div style={{ width: size, height: size }} />

  const col = iconIndex % SHEET_COLS
  const row = Math.floor(iconIndex / SHEET_COLS)
  const scale = size / FRAME_PX

  return (
    <div style={{
      width: size,
      height: size,
      backgroundImage: `url(${imgUrl})`,
      backgroundPosition: `-${col * FRAME_PX * scale}px -${row * FRAME_PX * scale}px`,
      backgroundSize: `${SHEET_COLS * FRAME_PX * scale}px ${SHEET_ROWS * FRAME_PX * scale}px`,
      imageRendering: 'pixelated',
      flexShrink: 0,
    }} />
  )
}
