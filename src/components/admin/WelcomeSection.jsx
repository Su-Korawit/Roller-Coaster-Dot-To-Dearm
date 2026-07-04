import { useEffect, useState } from 'react'
import {
  getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { refs, cols } from '../../lib/db'
import { uploadAsset } from '../../utils/storageOps'
import { useToast } from './Toast'

async function uploadWelcomeMedia(file, kind) {
  const path = `welcome/${kind}/${Date.now()}-${file.name}`
  return uploadAsset(path, file, { contentType: file.type || 'image/png' })
}

export default function WelcomeSection() {
  const toast = useToast()
  const [gamePreview, setGamePreview] = useState({ mediaUrl: '', mediaType: 'gif' })
  const [stats, setStats] = useState([])
  const [news, setNews] = useState([])
  const [faq, setFaq] = useState([])
  const [testimonials, setTestimonials] = useState([])

  async function reload() {
    const [gp, st, nw, fq, ts] = await Promise.all([
      getDoc(refs.welcomeGamePreview()),
      getDoc(refs.welcomeStats()),
      getDocs(query(cols.welcomeNews, orderBy('createdAt', 'desc'))),
      getDocs(query(cols.welcomeFaq, orderBy('order', 'asc'))),
      getDocs(query(cols.welcomeTestimonials, orderBy('order', 'asc'))),
    ])
    if (gp.exists()) setGamePreview({ mediaType: 'gif', mediaUrl: '', ...gp.data() })
    setStats(st.exists() ? (st.data().items ?? []) : [])
    setNews(nw.docs.map((d) => ({ id: d.id, ...d.data() })))
    setFaq(fq.docs.map((d) => ({ id: d.id, ...d.data() })))
    setTestimonials(ts.docs.map((d) => ({ id: d.id, ...d.data() })))
  }
  useEffect(() => { reload().catch((e) => toast.error?.(String(e))) }, []) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  // ── Game preview ──
  async function onUploadPreview(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const mediaUrl = await uploadWelcomeMedia(file, 'gamePreview')
      const mediaType = file.type.startsWith('video') ? 'video' : 'gif'
      await setDoc(refs.welcomeGamePreview(), { mediaUrl, mediaType })
      setGamePreview({ mediaUrl, mediaType })
      toast.success?.('อัปเดต Game Preview แล้ว')
    } catch {
      toast.error?.('อัปโหลดไม่สำเร็จ')
    }
  }

  // ── Stats (array on one doc) ──
  async function saveStats(next) {
    try {
      await setDoc(refs.welcomeStats(), { items: next })
      setStats(next)
      toast.success?.('บันทึก Stats แล้ว')
    } catch {
      toast.error?.('บันทึกไม่สำเร็จ')
    }
  }

  // ── Generic list CRUD ──
  async function addItem(col, payload, withCreatedAt) {
    try {
      await addDoc(col, withCreatedAt ? { ...payload, createdAt: serverTimestamp() } : payload)
      await reload()
    } catch {
      toast.error?.('บันทึกไม่สำเร็จ')
    }
  }
  async function removeItem(col, id) {
    try {
      await deleteDoc(doc(col, id))
      await reload()
    } catch {
      toast.error?.('บันทึกไม่สำเร็จ')
    }
  }
  async function patchItem(col, id, payload) {
    try {
      await updateDoc(doc(col, id), payload)
      await reload()
    } catch {
      toast.error?.('บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="space-y-10">
      {/* GAME PREVIEW */}
      <section>
        <h2 className="text-lg font-bold text-ink mb-3">Game Preview</h2>
        {gamePreview.mediaUrl && (
          <p className="text-xs text-gray-500 mb-2 break-all">{gamePreview.mediaUrl}</p>
        )}
        <input type="file" accept="image/gif,image/png,image/jpeg,video/mp4" onChange={onUploadPreview} />
      </section>

      {/* STATS */}
      <section>
        <h2 className="text-lg font-bold text-ink mb-3">Stats</h2>
        {stats.map((s, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              className="border rounded px-2 py-1 text-sm" placeholder="value (1.2k+)"
              value={s.value}
              onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
            />
            <input
              className="border rounded px-2 py-1 text-sm" placeholder="label (นักเรียน)"
              value={s.label}
              onChange={(e) => setStats(stats.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
            />
            <button className="text-rose-600 text-sm" onClick={() => saveStats(stats.filter((_, j) => j !== i))}>ลบ</button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <button className="text-brand text-sm" onClick={() => setStats([...stats, { value: '', label: '' }])}>+ เพิ่มแถว</button>
          <button className="bg-brand text-white rounded px-3 py-1 text-sm" onClick={() => saveStats(stats)}>บันทึก Stats</button>
        </div>
      </section>

      {/* NEWS */}
      <ListEditor
        title="News / Blog"
        items={news}
        fields={[
          { key: 'titleTh', label: 'หัวข้อ' },
          { key: 'bodyTh', label: 'เนื้อหา', textarea: true },
          { key: 'coverUrl', label: 'รูปปก URL (optional)' },
        ]}
        onAdd={(payload) => addItem(cols.welcomeNews, payload, true)}
        onPatch={(id, payload) => patchItem(cols.welcomeNews, id, payload)}
        onRemove={(id) => removeItem(cols.welcomeNews, id)}
        upload={(file) => uploadWelcomeMedia(file, 'news')}
        uploadTarget="coverUrl"
        onError={(msg) => toast.error?.(msg)}
      />

      {/* FAQ */}
      <ListEditor
        title="FAQ"
        items={faq}
        fields={[
          { key: 'q', label: 'คำถาม' },
          { key: 'a', label: 'คำตอบ', textarea: true },
          { key: 'order', label: 'ลำดับ', number: true },
        ]}
        onAdd={(payload) => addItem(cols.welcomeFaq, { order: 0, ...payload })}
        onPatch={(id, payload) => patchItem(cols.welcomeFaq, id, payload)}
        onRemove={(id) => removeItem(cols.welcomeFaq, id)}
      />

      {/* TESTIMONIALS */}
      <ListEditor
        title="Testimonials"
        items={testimonials}
        fields={[
          { key: 'name', label: 'ชื่อ' },
          { key: 'role', label: 'บทบาท (นักเรียน ม.6)' },
          { key: 'quote', label: 'ข้อความ', textarea: true },
          { key: 'order', label: 'ลำดับ', number: true },
          { key: 'avatarUrl', label: 'รูป URL (optional)' },
        ]}
        onAdd={(payload) => addItem(cols.welcomeTestimonials, { order: 0, ...payload })}
        onPatch={(id, payload) => patchItem(cols.welcomeTestimonials, id, payload)}
        onRemove={(id) => removeItem(cols.welcomeTestimonials, id)}
        upload={(file) => uploadWelcomeMedia(file, 'testimonials')}
        uploadTarget="avatarUrl"
        onError={(msg) => toast.error?.(msg)}
      />
    </div>
  )
}

// Small reusable add/edit/delete editor for a list collection.
function ListEditor({ title, items, fields, onAdd, onPatch, onRemove, upload, uploadTarget, onError }) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, f.number ? 0 : '']))
  const [draft, setDraft] = useState(blank)
  // Local edits for existing items, keyed by id; flushed to Firestore on Save.
  const [edits, setEdits] = useState({})

  function valueOf(it, key) {
    const f = fields.find((x) => x.key === key)
    return edits[it.id]?.[key] ?? it[key] ?? (f?.number ? 0 : '')
  }
  function editField(id, key, val) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [key]: val } }))
  }

  function setField(obj, setObj, key, val, number) {
    setObj({ ...obj, [key]: number ? Number(val) : val })
  }

  async function handleUpload(e, apply) {
    const file = e.target.files?.[0]
    if (!file || !upload) return
    try {
      const url = await upload(file)
      apply(uploadTarget, url)
    } catch {
      onError?.('อัปโหลดไม่สำเร็จ')
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-ink mb-3">{title}</h2>

      {/* Existing items */}
      <div className="space-y-3 mb-4">
        {items.map((it) => (
          <div key={it.id} className="border rounded-lg p-3">
            {fields.map((f) => (
              <div key={f.key} className="mb-2">
                <label className="block text-xs text-gray-500">{f.label}</label>
                {f.textarea ? (
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm" rows={3}
                    value={valueOf(it, f.key)}
                    onChange={(e) => editField(it.id, f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    type={f.number ? 'number' : 'text'}
                    value={valueOf(it, f.key)}
                    onChange={(e) => editField(it.id, f.key, f.number ? Number(e.target.value) : e.target.value)}
                  />
                )}
              </div>
            ))}
            {upload && (
              <input type="file" className="text-xs" onChange={(e) => handleUpload(e, (k, url) => editField(it.id, k, url))} />
            )}
            <div className="flex gap-2 mt-2">
              <button
                className="bg-brand text-white rounded px-3 py-1 text-sm"
                onClick={async () => {
                  if (edits[it.id]) {
                    await onPatch(it.id, edits[it.id])
                    setEdits((e) => { const n = { ...e }; delete n[it.id]; return n })
                  }
                }}
              >
                บันทึก
              </button>
              <button className="text-rose-600 text-sm" onClick={() => onRemove(it.id)}>ลบ</button>
            </div>
          </div>
        ))}
      </div>

      {/* New item draft */}
      <div className="border-2 border-dashed rounded-lg p-3">
        <p className="text-sm font-semibold mb-2">+ เพิ่มใหม่</p>
        {fields.map((f) => (
          <div key={f.key} className="mb-2">
            <label className="block text-xs text-gray-500">{f.label}</label>
            {f.textarea ? (
              <textarea
                className="w-full border rounded px-2 py-1 text-sm" rows={3}
                value={draft[f.key]}
                onChange={(e) => setField(draft, setDraft, f.key, e.target.value, false)}
              />
            ) : (
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                type={f.number ? 'number' : 'text'}
                value={draft[f.key]}
                onChange={(e) => setField(draft, setDraft, f.key, e.target.value, f.number)}
              />
            )}
          </div>
        ))}
        {upload && (
          <input type="file" className="text-xs mb-2" onChange={(e) => handleUpload(e, (k, url) => setDraft((d) => ({ ...d, [k]: url })))} />
        )}
        <button
          className="bg-brand text-white rounded px-3 py-1 text-sm"
          onClick={async () => { await onAdd(draft); setDraft(blank) }}
        >
          เพิ่ม
        </button>
      </div>
    </section>
  )
}
