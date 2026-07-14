import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../../stores/useAuthStore'
import { uploadWithProgress } from '../../utils/storageOps'
import { getMusicConfig, saveMusicConfig } from '../../utils/musicConfig'
import { useToast } from './Toast'

// HomePage streams this single file and seeks within it using the track offsets.
const AUDIO_PATH = 'media/audio/Background_Music_1.mp3'

export default function MusicSection() {
  const [tracks, setTracks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(null) // 0-100 | null
  const adminUid = useAuthStore((s) => s.user?.uid)
  const toast = useToast()
  const fileRef = useRef(null)

  useEffect(() => {
    let alive = true
    getMusicConfig().then(({ tracks }) => {
      if (alive) { setTracks(tracks); setLoading(false) }
    })
    return () => { alive = false }
  }, [])

  const handleUpload = useCallback((file) => {
    if (!file) return
    setProgress(0)
    uploadWithProgress(AUDIO_PATH, file, { onProgress: setProgress })
      .then(() => { setProgress(null); toast?.success('อัปโหลดเพลงแล้ว') })
      .catch((err) => { setProgress(null); toast?.error(err.message) })
  }, [toast])

  const updateRow = (i, patch) =>
    setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const addRow = () => setTracks((prev) => [...prev, { title: '', start: 0 }])
  const removeRow = (i) => setTracks((prev) => prev.filter((_, idx) => idx !== i))
  const moveRow = (i, dir) =>
    setTracks((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const handleSave = useCallback(async () => {
    const cleaned = tracks
      .map((t) => ({ title: t.title.trim(), start: Number(t.start) || 0 }))
      .filter((t) => t.title)
    if (cleaned.length === 0) { toast?.error('ต้องมีอย่างน้อย 1 แทร็ก'); return }
    setSaving(true)
    try {
      await saveMusicConfig(cleaned, adminUid)
      setTracks(cleaned)
      toast?.success('บันทึกรายการเพลงแล้ว')
    } catch (err) {
      console.error('[MusicSection] save', err)
      toast?.error('บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }, [tracks, adminUid, toast])

  if (loading) {
    return <div className="py-24 text-center text-gray-400 text-sm animate-pulse">กำลังโหลด...</div>
  }

  return (
    <div className="space-y-8">
      {/* Audio file */}
      <section>
        <h3 className="font-semibold text-gray-800 mb-2">ไฟล์เพลงพื้นหลัง</h3>
        <p className="text-xs text-gray-500 mb-3">อัปโหลดไฟล์ใหม่เพื่อแทนที่เพลงพื้นหลังในหน้า Home (เล่นต่อเนื่องไฟล์เดียว)</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={progress !== null}
            className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-strong transition-colors disabled:opacity-50"
          >
            {progress !== null ? `${progress}%` : '⬆ อัปโหลด / แทนที่'}
          </button>
          {progress !== null && (
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden max-w-xs">
              <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
      </section>

      {/* Track list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">รายการแทร็ก</h3>
            <p className="text-xs text-gray-500 mt-0.5">ชื่อเพลง + วินาทีที่เริ่ม (จุดเริ่มในไฟล์)</p>
          </div>
          <button onClick={addRow} className="text-xs text-brand hover:underline font-semibold">+ เพิ่มแทร็ก</button>
        </div>

        <div className="space-y-2">
          {tracks.map((t, i) => (
            <div key={i} className="flex items-center gap-2 p-2 neo-slab">
              <div className="flex flex-col">
                <button onClick={() => moveRow(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-brand disabled:opacity-30 text-xs leading-none">▲</button>
                <button onClick={() => moveRow(i, 1)} disabled={i === tracks.length - 1} className="text-gray-400 hover:text-brand disabled:opacity-30 text-xs leading-none">▼</button>
              </div>
              <input
                value={t.title}
                onChange={(e) => updateRow(i, { title: e.target.value })}
                placeholder="ชื่อเพลง"
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <input
                type="number"
                min="0"
                value={t.start}
                onChange={(e) => updateRow(i, { start: e.target.value })}
                className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <span className="text-xs text-gray-400">วิ</span>
              <button onClick={() => removeRow(i)} className="px-2 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50">ลบ</button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 px-6 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-strong transition-colors disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกรายการเพลง'}
        </button>
      </section>
    </div>
  )
}
