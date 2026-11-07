import { useEffect, useState } from 'react'
import { ArrowLeft, Star, Check } from 'lucide-react'
import { AppTile } from '../AppIcon'
import InstallButton from '../InstallButton'
import { useAuthStore } from '../../stores/useAuthStore'
import { useAppReviewsStore } from '../../stores/useAppReviewsStore'
import { summarizeReviews, MAX_REVIEW_TEXT } from '../reviewsLogic'

function Stars({ value, size = 16 }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden="true" className={n <= Math.round(value) ? 'text-zone-biz fill-zone-biz' : 'text-hairline'} />
      ))}
    </span>
  )
}

function formatDate(ts) {
  const ms = ts?.toMillis?.()
  return ms ? new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'เมื่อสักครู่'
}

// Preview pictures of the app: /assets/os/shots/<id>-1..N.webp (N = app.shots, default 3 for the core
// apps). A picture that is missing is skipped; with none at all the section is hidden.
function Shots({ app }) {
  const count = app.shots ?? (app.defaultInstalled ? 3 : 0)
  const [failed, setFailed] = useState({})
  const [big, setBig] = useState(null)
  const list = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !failed[n])
  if (list.length === 0) return null
  return (
    <section aria-label="ภาพตัวอย่าง" className="flex flex-col gap-2">
      <h4 className="thai-font font-bold">ภาพตัวอย่าง</h4>
      <ul className="flex gap-3 overflow-x-auto os-pages pb-1">
        {list.map((n) => (
          <li key={n} className="shrink-0">
            <button type="button" onClick={() => setBig(n)} aria-label={`ขยายภาพตัวอย่าง ${n}`} className="block rounded-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <img
                src={`/assets/os/shots/${app.id}-${n}.webp`}
                alt={`ภาพตัวอย่าง ${app.name} ${n}`}
                loading="lazy"
                draggable={false}
                onError={() => setFailed((f) => ({ ...f, [n]: true }))}
                className="h-52 w-auto rounded-ui border-2 border-line-soft bg-mist"
              />
            </button>
          </li>
        ))}
      </ul>
      {big && (
        <div className="fixed inset-0 z-[70] bg-ink/70 flex items-center justify-center p-4" onClick={() => setBig(null)} role="dialog" aria-modal="true" aria-label="ภาพตัวอย่างขยาย">
          <img src={`/assets/os/shots/${app.id}-${big}.webp`} alt="" className="max-w-full max-h-full rounded-ui border-2 border-line" />
        </div>
      )}
    </section>
  )
}

// Store detail page: what the app does + preview pictures + ratings and comments from other students.
export default function StoreAppDetail({ app, installed, onOpen, onBack }) {
  const uid = useAuthStore((s) => s.user?.uid)
  const { reviews, loading, error, load, submit, remove } = useAppReviewsStore()
  const [draft, setDraft] = useState({})   // what the user typed; falls back to their saved review
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { load(app.id) }, [app.id, load])

  const mine = reviews.find((r) => r.uid === uid)
  const rating = draft.rating ?? mine?.rating ?? 0
  const text = draft.text ?? mine?.text ?? ''
  const setRating = (rating) => setDraft((d) => ({ ...d, rating }))
  const setText = (text) => setDraft((d) => ({ ...d, text }))

  const { count, average, histogram } = summarizeReviews(reviews)

  async function send(e) {
    e.preventDefault()
    setBusy(true)
    setMsg((await submit(app.id, { rating, text })) ?? (mine ? 'แก้ไขรีวิวแล้ว' : 'ขอบคุณสำหรับรีวิว'))
    setBusy(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <button type="button" onClick={onBack} className="self-start flex items-center gap-1 thai-font text-sm font-semibold text-brand-strong">
        <ArrowLeft size={16} /> กลับไป Store
      </button>

      <header className="flex items-center gap-4">
        <AppTile app={app} size={84} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-xl truncate">{app.name}</h3>
          <p className="thai-font text-sm text-ink-soft">{app.tagline}</p>
          <div className="flex items-center gap-2 mt-1 thai-font text-xs text-ink-soft">
            <Stars value={average} />
            <span>{count ? `${average} (${count} รีวิว)` : 'ยังไม่มีรีวิว'}</span>
          </div>
        </div>
      </header>

      <InstallButton app={app} installed={installed} onOpen={onOpen} big />

      <Shots key={app.id} app={app} />

      {app.features?.length > 0 && (
        <section className="px-card p-4" aria-label="สิ่งที่แอปทำได้">
          <h4 className="thai-font font-bold mb-2">แอปนี้ทำอะไรได้บ้าง</h4>
          <ul className="flex flex-col gap-1.5">
            {app.features.map((f) => (
              <li key={f} className="flex items-start gap-2 thai-font text-sm">
                <Check size={16} className="text-zone-earth-deep mt-0.5 shrink-0" aria-hidden="true" /> {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {app.description && <p className="thai-font text-sm leading-relaxed text-ink-soft">{app.description}</p>}

      <section className="px-card p-4 flex flex-col gap-4" aria-label="รีวิว">
        <h4 className="thai-font font-bold">คะแนนและรีวิว</h4>

        <div className="flex items-center gap-5">
          <div className="text-center shrink-0">
            <p className="font-display font-bold text-4xl leading-none">{count ? average.toFixed(1) : '-'}</p>
            <p className="thai-font text-xs text-ink-soft mt-1">{count} รีวิว</p>
          </div>
          <ul className="flex-1 flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n} className="flex items-center gap-2 thai-font text-xs">
                <span className="w-3 text-right">{n}</span>
                <span className="flex-1 h-2 rounded-full bg-mist overflow-hidden">
                  <span className="block h-full bg-zone-biz" style={{ width: count ? `${(histogram[n] / count) * 100}%` : 0 }} />
                </span>
                <span className="w-5 text-ink-soft">{histogram[n]}</span>
              </li>
            ))}
          </ul>
        </div>

        {uid ? (
          <form onSubmit={send} className="flex flex-col gap-2 border-t-2 border-hairline pt-3">
            <p className="thai-font text-sm font-semibold">{mine ? 'รีวิวของคุณ' : 'ให้คะแนนแอปนี้'}</p>
            <div className="flex gap-1" role="radiogroup" aria-label="ให้ดาว">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} ดาว`}
                  onClick={() => setRating(n)}
                  className="p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
                >
                  <Star size={28} className={n <= rating ? 'text-zone-biz fill-zone-biz' : 'text-hairline'} />
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_REVIEW_TEXT))}
              rows={3}
              placeholder="เขียนความเห็น (ไม่บังคับ)"
              aria-label="ความเห็น"
              className="px-input p-3 thai-font text-sm resize-none"
            />
            <div className="flex items-center gap-2">
              <button type="submit" disabled={busy || !rating} className="px-btn px-4 py-2 thai-font text-sm font-bold bg-paper disabled:opacity-50">
                {mine ? 'บันทึกการแก้ไข' : 'ส่งรีวิว'}
              </button>
              {mine && (
                <button type="button" disabled={busy} onClick={async () => setMsg((await remove(app.id)) ?? 'ลบรีวิวแล้ว')} className="px-btn px-4 py-2 thai-font text-sm font-bold bg-paper text-danger">
                  ลบ
                </button>
              )}
              <span className="thai-font text-xs text-ink-soft ml-auto">{text.length}/{MAX_REVIEW_TEXT}</span>
            </div>
            {msg && <p role="status" className="thai-font text-sm text-brand-strong">{msg}</p>}
          </form>
        ) : (
          <p className="thai-font text-sm text-ink-soft border-t-2 border-hairline pt-3">เข้าสู่ระบบเพื่อให้คะแนนและเขียนรีวิว</p>
        )}

        {loading && <p className="thai-font text-sm text-ink-soft">กำลังโหลดรีวิว...</p>}
        {error && <p role="alert" className="thai-font text-sm text-zone-health-deep">{error}</p>}
        {!loading && !error && reviews.length === 0 && <p className="thai-font text-sm text-ink-soft text-center py-2">ยังไม่มีรีวิว เป็นคนแรกเลย</p>}
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="thai-font text-sm border-t-2 border-hairline pt-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{r.name}{r.uid === uid ? ' (คุณ)' : ''}</span>
                <Stars value={r.rating} size={13} />
                <span className="ml-auto text-xs text-ink-soft shrink-0">{formatDate(r.updatedAt)}</span>
              </div>
              {r.text && <p className="mt-1 leading-relaxed whitespace-pre-wrap break-words">{r.text}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
