import { useEffect, useState } from 'react'
import {
  subscribeSchoolPosts, createSchoolPost, deleteSchoolPost,
  validatePostDraft, POST_TITLE_MAX, POST_BODY_MAX,
} from '../../../services/schoolBoard'

const DRAFT_ERRORS = {
  TITLE_REQUIRED: 'ใส่หัวข้อก่อนโพสต์',
  TITLE_TOO_LONG: `หัวข้อยาวเกิน ${POST_TITLE_MAX} ตัวอักษร`,
  BODY_TOO_LONG: `เนื้อหายาวเกิน ${POST_BODY_MAX} ตัวอักษร`,
}

const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '')

// School announcements shown above the TCAS calendar on the canteen board.
// Readable by members of the school; only a verified teacher of the school sees the composer.
export default function SchoolAnnouncements({ schoolId, user, isTeacher }) {
  const [state, setState] = useState({ status: 'loading', posts: [] })
  const [draft, setDraft] = useState({ title: '', body: '' })
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!schoolId) return undefined
    return subscribeSchoolPosts(
      schoolId,
      (posts) => setState({ status: 'ready', posts }),
      () => setState({ status: 'error', posts: [] }),
    )
  }, [schoolId])

  if (!schoolId) return null

  async function submit(e) {
    e.preventDefault()
    const check = validatePostDraft(draft)
    if (!check.ok) { setFormError(DRAFT_ERRORS[check.error]); return }
    setBusy(true)
    setFormError(null)
    try {
      await createSchoolPost({ schoolId, ...draft, user })
      setDraft({ title: '', body: '' })
    } catch {
      setFormError('โพสต์ไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="ประกาศจากโรงเรียน" className="flex flex-col gap-2">
      <h3 className="pixel-font text-[10px] text-ink/60">ประกาศจากโรงเรียน</h3>

      {isTeacher && (
        <form onSubmit={submit} className="neo-slab p-3 flex flex-col gap-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            maxLength={POST_TITLE_MAX}
            placeholder="หัวข้อประกาศ"
            aria-label="หัวข้อประกาศ"
            className="thai-font text-sm border-2 border-ink rounded-lg px-2 py-1.5 bg-surface"
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            maxLength={POST_BODY_MAX}
            rows={3}
            placeholder="รายละเอียด (ไม่บังคับ)"
            aria-label="รายละเอียดประกาศ"
            className="thai-font text-sm border-2 border-ink rounded-lg px-2 py-1.5 bg-surface"
          />
          {formError && <p role="alert" className="thai-font text-xs text-accent-pink">{formError}</p>}
          <button type="submit" disabled={busy} className="neo-btn rpg-btn-primary pixel-font text-[10px] py-2 rounded-lg disabled:opacity-50">
            {busy ? 'กำลังโพสต์…' : 'โพสต์ประกาศ'}
          </button>
        </form>
      )}

      {state.status === 'error' && (
        <p className="thai-font text-xs text-ink/60">ดูประกาศได้เฉพาะสมาชิกของโรงเรียนนี้</p>
      )}
      {state.status === 'ready' && state.posts.length === 0 && (
        <p className="thai-font text-sm text-ink/60">ยังไม่มีประกาศจากโรงเรียน</p>
      )}
      {state.posts.map((p) => (
        <article key={p.id} className="neo-card px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="thai-font text-sm font-bold text-ink">{p.title}</h4>
            <span className="thai-font text-[10px] text-ink/50 shrink-0">{fmtDate(p.createdAt)}</span>
          </div>
          {p.body && <p className="thai-font text-xs text-ink whitespace-pre-line mt-0.5">{p.body}</p>}
          <div className="flex items-center justify-between mt-1">
            <span className="thai-font text-[10px] text-ink/60">🎓 {p.authorName || 'ครู'}</span>
            {user?.uid === p.authorUid && (
              <button
                onClick={() => deleteSchoolPost(schoolId, p.id)}
                className="thai-font text-[10px] text-accent-pink underline"
              >
                ลบ
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  )
}
