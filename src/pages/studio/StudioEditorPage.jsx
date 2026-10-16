import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDoc } from 'firebase/firestore'
import { refs } from '../../lib/db'
import { saveDraft, publishArticle, unpublishArticle, PublishError } from '../../services/articles'
import { createAutosaver } from '../../content/autosave'
import { CATEGORIES, LIMITS, suggestSlug } from '../../content/schema'
import { validateDraftForPublish } from '../../content/validatePublish'
import { hubArticleUrl } from '../../content/hubUrl'
import ArticleEditor from '../../components/studio/ArticleEditor'
import ImageUploadButton from '../../components/studio/ImageUploadButton'
import PublishChecklist from '../../components/studio/PublishChecklist'
import SaveStatus from '../../components/studio/SaveStatus'
import Button from '../../components/ui/Button'

const FIELD = 'px-input w-full bg-white px-3 py-2'
const LABEL = 'flex flex-col gap-1 text-sm font-bold text-ink'

// Mounted only after the draft has loaded, so nothing can be autosaved over it early.
function EditorForm({ draftId, initial }) {
  const [form, setForm] = useState({
    title: initial.title ?? '',
    slug: initial.slug ?? '',
    category: initial.category ?? 'guide',
    excerpt: initial.excerpt ?? '',
    coverUrl: initial.coverUrl ?? '',
    coverAlt: initial.coverAlt ?? '',
    tags: Array.isArray(initial.tags) ? initial.tags : [],
    body: initial.body ?? '',
  })
  const [tagsText, setTagsText] = useState((initial.tags ?? []).join(', '))
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug))
  const [meta, setMeta] = useState({ publishedSlug: initial.publishedSlug ?? '', isLive: initial.isLive === true })
  const [saveStatus, setSaveStatus] = useState('idle')
  const [issues, setIssues] = useState([])
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [saver] = useState(() =>
    createAutosaver({ save: (patch) => saveDraft(draftId, patch), onStatus: setSaveStatus }),
  )

  // Leaving the page must not lose the last edits.
  useEffect(() => () => { saver.flush() }, [saver])
  useEffect(() => {
    const warn = (e) => {
      if (saver.status === 'pending' || saver.status === 'error') e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saver])

  const edit = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    saver.push(patch)
  }
  const onTitle = (title) => {
    const patch = { title }
    if (!meta.publishedSlug && !slugTouched) patch.slug = suggestSlug(title, draftId)
    edit(patch)
  }
  const onTags = (text) => {
    setTagsText(text)
    edit({ tags: text.split(',').map((t) => t.trim()).filter(Boolean) })
  }

  const publish = async () => {
    setIssues([])
    setProblem('')
    setBusy(true)
    try {
      await saver.flush()
      if (saver.status === 'error') return
      const check = validateDraftForPublish(form)
      if (!check.ok) {
        setIssues(check.errors)
        return
      }
      const res = await publishArticle(draftId)
      setMeta({ publishedSlug: res.slug, isLive: true })
    } catch (err) {
      if (err instanceof PublishError) setIssues(err.errors)
      else if (String(err?.code).includes('already-exists')) setProblem('ลิงก์นี้มีบทความอื่นใช้แล้ว ลองเปลี่ยนลิงก์บทความ')
      else {
        console.error('[studio] publish failed:', err)
        setProblem('เผยแพร่ไม่สำเร็จ ลองใหม่อีกครั้ง')
      }
    } finally {
      setBusy(false)
    }
  }

  const unpublish = async () => {
    if (!window.confirm('ถอนบทความออกจากเว็บไซต์ใช่ไหม ร่างของคุณจะยังอยู่')) return
    setProblem('')
    try {
      await unpublishArticle(meta.publishedSlug)
      setMeta((m) => ({ ...m, isLive: false }))
    } catch (err) {
      console.error('[studio] unpublish failed:', err)
      setProblem('ถอนบทความไม่สำเร็จ ลองใหม่อีกครั้ง')
    }
  }

  return (
    <div className="min-h-dvh bg-mist">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/studio" className="text-sm text-ink-soft underline">← บทความทั้งหมด</Link>
          <div className="flex items-center gap-3">
            <SaveStatus status={saveStatus} />
            <span className="rounded-slot px-2 py-0.5 text-xs font-bold bg-white text-ink">
              {meta.isLive ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
            </span>
          </div>
        </header>

        <label className={LABEL}>
          ชื่อบทความ
          <input className={FIELD} maxLength={LIMITS.titleMax} value={form.title} onChange={(e) => onTitle(e.target.value)} />
        </label>

        <div className="flex flex-col gap-1">
          <label htmlFor="studio-slug" className="text-sm font-bold text-ink">ลิงก์บทความ</label>
          <input
            id="studio-slug"
            className={FIELD}
            value={form.slug}
            disabled={Boolean(meta.publishedSlug)}
            onChange={(e) => {
              setSlugTouched(true)
              edit({ slug: e.target.value })
            }}
          />
          <span className="text-sm text-ink-soft">
            {meta.publishedSlug ? 'เผยแพร่แล้ว เปลี่ยนลิงก์ไม่ได้' : 'ใช้ตัวอักษรอังกฤษ ตัวเลข และ - เปลี่ยนไม่ได้หลังเผยแพร่'}
          </span>
        </div>

        <label className={LABEL}>
          หมวดหมู่
          <select className={FIELD} value={form.category} onChange={(e) => edit({ category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.labelTh}</option>)}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <label htmlFor="studio-excerpt" className="text-sm font-bold text-ink">คำโปรย</label>
          <textarea
            id="studio-excerpt"
            className={FIELD}
            rows={3}
            value={form.excerpt}
            onChange={(e) => edit({ excerpt: e.target.value })}
          />
          <span className={`text-sm ${form.excerpt.length > LIMITS.excerptMax ? 'text-ink font-bold' : 'text-ink-soft'}`}>
            {form.excerpt.length} / {LIMITS.excerptMax}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink">รูปปก</span>
          {form.coverUrl && <img src={form.coverUrl} alt={form.coverAlt} className="rounded-card max-h-48 object-cover" />}
          <ImageUploadButton
            draftId={draftId}
            label={form.coverUrl ? 'เปลี่ยนรูปปก' : 'เพิ่มรูปปก'}
            onUploaded={(url) => edit({ coverUrl: url })}
            className="px-btn bg-white text-ink h-11 px-4 font-bold self-start"
          />
          <label className={LABEL}>
            คำอธิบายรูปปก
            <input className={FIELD} value={form.coverAlt} onChange={(e) => edit({ coverAlt: e.target.value })} />
          </label>
        </div>

        <label className={LABEL}>
          แท็ก (คั่นด้วยจุลภาค)
          <input className={FIELD} value={tagsText} onChange={(e) => onTags(e.target.value)} />
        </label>

        <ArticleEditor draftId={draftId} initialBody={form.body} onChange={(body) => edit({ body })} />

        <PublishChecklist errors={issues} />
        {problem && <p role="alert" className="px-card bg-warn p-3 text-sm text-ink">{problem}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Button onClick={publish} disabled={busy}>{meta.isLive ? 'อัปเดตบทความ' : 'เผยแพร่'}</Button>
          </div>
          <Link
            to={`/studio/preview/${draftId}`}
            target="_blank"
            onClick={() => saver.flush()}
            className="px-btn bg-white text-ink h-11 px-4 inline-flex items-center font-bold"
          >
            ดูตัวอย่าง
          </Link>
          {meta.isLive && (
            <>
              <a href={hubArticleUrl(meta.publishedSlug)} target="_blank" rel="noreferrer" className="text-sm text-ink underline">
                ดูบทความบนเว็บ
              </a>
              <button type="button" onClick={unpublish} className="text-sm text-ink-soft underline h-11 px-2">
                ถอนบทความ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudioEditorPage() {
  const { draftId } = useParams()
  const [loaded, setLoaded] = useState({ id: null, draft: null })

  useEffect(() => {
    let cancelled = false
    getDoc(refs.articleDraft(draftId))
      .then((snap) => {
        if (!cancelled) setLoaded({ id: draftId, draft: snap.exists() ? snap.data() : false })
      })
      .catch((e) => {
        console.error('[studio] loading draft failed:', e)
        if (!cancelled) setLoaded({ id: draftId, draft: false })
      })
    return () => {
      cancelled = true
    }
  }, [draftId])

  if (loaded.id !== draftId) return null
  if (!loaded.draft) {
    return (
      <div className="min-h-dvh bg-mist flex flex-col items-center justify-center gap-3">
        <p className="text-ink">ไม่พบบทความนี้</p>
        <Link to="/studio" className="text-sm text-ink-soft underline">กลับไปรายการบทความ</Link>
      </div>
    )
  }
  return <EditorForm key={draftId} draftId={draftId} initial={loaded.draft} />
}
