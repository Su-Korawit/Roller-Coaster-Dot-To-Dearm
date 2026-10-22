import { useEffect, useState } from 'react'
import { getDocs, setDoc } from 'firebase/firestore'
import { refs, cols } from '../../lib/db'
import { useToast } from './Toast'

const FIELD = 'w-28 rounded border border-gray-300 bg-white px-2 py-1 text-sm'

// Prices and visibility of study-room items (Firestore roomCatalog). Art, ids and footprints
// are code-owned (src/data/roomCatalogSeed.js), so only `price` and `hidden` are editable.
export default function RoomCatalogSection() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    let alive = true
    getDocs(cols.roomCatalog)
      .then((snap) => {
        if (!alive) return
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
        setRows(list)
        setDrafts(Object.fromEntries(list.map((r) => [r.id, String(r.price)])))
      })
      .catch((e) => {
        console.error('[RoomCatalogSection] load failed:', e)
        if (alive) setRows([])
      })
    return () => { alive = false }
  }, [])

  if (!rows) return <p className="text-sm text-ink-soft">กำลังโหลด…</p>
  if (rows.length === 0) return <p className="text-sm text-ink-soft">ยังไม่มีรายการ — รัน scripts/seedRoomCatalog.mjs --apply ก่อน</p>

  const write = async (id, patch, doneText) => {
    try {
      await setDoc(refs.roomCatalog(id), patch, { merge: true })
      toast.success?.(doneText)
      return true
    } catch (e) {
      console.error('[RoomCatalogSection] save failed:', e)
      toast.error?.('บันทึกไม่สำเร็จ')
      return false
    }
  }

  const savePrice = async (row) => {
    const text = drafts[row.id] ?? ''
    if (!/^\d+$/.test(text)) {
      setErrors((e) => ({ ...e, [row.id]: 'ราคาต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป' }))
      return
    }
    setErrors((e) => ({ ...e, [row.id]: '' }))
    const price = Number(text)
    if (await write(row.id, { price }, `บันทึกราคา ${row.name} แล้ว`)) {
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, price } : r)))
    }
  }

  const toggleHidden = async (row, hidden) => {
    if (await write(row.id, { hidden }, hidden ? `ซ่อน ${row.name} แล้ว` : `แสดง ${row.name} แล้ว`)) {
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, hidden } : r)))
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-ink">ราคาไอเท็มในห้อง</h2>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-3">
            <span className="w-48 text-sm font-semibold text-ink">{row.name}</span>
            <span className="text-xs text-ink-soft">{row.kind}</span>
            <input
              className={FIELD}
              inputMode="numeric"
              aria-label={`ราคา ${row.name}`}
              value={drafts[row.id] ?? ''}
              onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
            />
            <button
              type="button"
              aria-label={`บันทึกราคา ${row.name}`}
              className="bg-brand text-white rounded px-3 py-1 text-sm font-semibold"
              onClick={() => savePrice(row)}
            >
              บันทึก
            </button>
            <label className="flex items-center gap-1 text-sm text-ink">
              <input
                type="checkbox"
                aria-label={`ซ่อนจากร้าน ${row.name}`}
                checked={row.hidden === true}
                onChange={(e) => toggleHidden(row, e.target.checked)}
              />
              ซ่อนจากร้าน
            </label>
            {errors[row.id] && <p role="alert" className="w-full text-sm text-rose-600">{errors[row.id]}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
