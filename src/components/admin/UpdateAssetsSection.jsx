// src/components/admin/UpdateAssetsSection.jsx
//
// Downloads the latest Sprout Lands assets (sprites/, ui/, audio/) from Firebase Storage
// to a user-selected local folder using the File System Access API.
// The rc/ folder (Roller Coaster custom assets) is never touched.
//
// Browser support: Chrome 86+, Edge 86+. Firefox and Safari require a polyfill.

import { useState, useCallback } from 'react'
import { getDownloadURL } from 'firebase/storage'
import { listAllRecursive } from '../../utils/storageOps'
import { useToast } from './Toast'

// Sprout Lands folders in Firebase Storage — these are safe to replace.
// rc/ is intentionally excluded (Roller Coaster custom assets).
const SYNC_PREFIXES = ['sprites', 'ui', 'audio']

async function writeToLocal(dirHandle, relativePath, blob) {
  const parts   = relativePath.replace(/^\//, '').split('/')
  let   current = dirHandle
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i], { create: true })
  }
  const fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true })
  const writable   = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

export default function UpdateAssetsSection() {
  const toast = useToast()

  const [phase,    setPhase]    = useState('idle')  // idle | listing | downloading | done | error
  const [total,    setTotal]    = useState(0)
  const [done,     setDone]     = useState(0)
  const [failed,   setFailed]   = useState([])
  const [destName, setDestName] = useState(null)

  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  const handleUpdate = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      toast?.error('Browser นี้ไม่รองรับ File System Access API — ใช้ Chrome หรือ Edge')
      return
    }

    let dirHandle
    try {
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    } catch {
      return // user cancelled
    }

    setDestName(dirHandle.name)
    setPhase('listing')
    setDone(0)
    setFailed([])

    let allItems
    try {
      const itemLists = await Promise.all(
        SYNC_PREFIXES.map((prefix) => listAllRecursive(prefix))
      )
      allItems = itemLists.flat()
    } catch (err) {
      console.error('Firebase list error:', err)
      setPhase('error')
      toast?.error('ดึงรายการไฟล์จาก Firebase ไม่สำเร็จ')
      return
    }

    setTotal(allItems.length)
    setPhase('downloading')

    const errors = []

    for (const item of allItems) {
      try {
        const url  = await getDownloadURL(item.ref)
        const resp = await fetch(url)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const blob = await resp.blob()
        await writeToLocal(dirHandle, item.path, blob)
      } catch (err) {
        console.error('Failed:', item.path, err)
        errors.push(item.path)
      }
      setDone((n) => n + 1)
    }

    setFailed(errors)
    setPhase('done')

    if (errors.length === 0) {
      toast?.success(`อัปเดตสำเร็จ — ${allItems.length} ไฟล์ ไปยัง "${dirHandle.name}"`)
    } else {
      toast?.error(`อัปเดต ${allItems.length - errors.length}/${allItems.length} ไฟล์ (${errors.length} ไฟล์ผิดพลาด)`)
    }
  }, [toast])

  const handleReset = () => {
    setPhase('idle')
    setTotal(0)
    setDone(0)
    setFailed([])
    setDestName(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">Update Assets</h2>
        <p className="mt-1 text-sm text-gray-500">
          ดาวน์โหลด Sprout Lands assets ล่าสุด (<code>sprites/</code>, <code>ui/</code>,{' '}
          <code>audio/</code>) จาก Firebase Storage ไปยัง folder ในเครื่องของคุณ
        </p>
        <p className="mt-1 text-xs text-gray-400">
          <code>rc/</code> (งาน Roller Coaster) จะไม่ถูกแตะต้อง
        </p>
      </div>

      {phase === 'idle' && (
        <button
          onClick={handleUpdate}
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white active:opacity-80"
        >
          <span>⬇️</span>
          Update Assets from Firebase
        </button>
      )}

      {(phase === 'listing' || phase === 'downloading') && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <span className="text-sm text-gray-600">
              {phase === 'listing'
                ? 'กำลังดึงรายการไฟล์จาก Firebase…'
                : `กำลังดาวน์โหลด ${done} / ${total} ไฟล์…`}
            </span>
          </div>

          {phase === 'downloading' && total > 0 && (
            <div className="overflow-hidden rounded-full bg-gray-100" style={{ height: 8 }}>
              <div
                className="h-full rounded-full bg-brand transition-all duration-150"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}

          {destName && (
            <p className="text-xs text-gray-400">
              ปลายทาง: <span className="font-mono">{destName}</span>
            </p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            {failed.length === 0 ? (
              <><span>✅</span> อัปเดตสำเร็จ — {total} ไฟล์</>
            ) : (
              <><span>⚠️</span> อัปเดต {total - failed.length}/{total} ไฟล์</>
            )}
          </div>

          {destName && (
            <p className="text-xs text-gray-500">
              folder: <span className="font-mono">{destName}</span>
            </p>
          )}

          {failed.length > 0 && (
            <details className="text-xs text-red-500">
              <summary className="cursor-pointer">{failed.length} ไฟล์ผิดพลาด</summary>
              <ul className="mt-1 space-y-0.5 font-mono">
                {failed.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </details>
          )}

          <button
            onClick={handleReset}
            className="text-xs text-brand underline"
          >
            อัปเดตอีกครั้ง
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-2">
          <p className="text-sm text-red-600">เกิดข้อผิดพลาด — ตรวจสอบ console และลองใหม่</p>
          <button onClick={handleReset} className="text-xs text-brand underline">
            ลองใหม่
          </button>
        </div>
      )}
    </div>
  )
}
