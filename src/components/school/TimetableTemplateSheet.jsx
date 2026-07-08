import { useEffect, useState } from 'react'
import { Search, Trash2, Share2, CheckCircle2 } from 'lucide-react'
import Popup from '../ui/Popup'
import { useTimetableTemplatesStore } from '../../stores/useTimetableTemplatesStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { fromTimetableTemplate } from '../../utils/timetableTemplate'
import { CLASS_LEVELS } from '../../constants/classLevels'

export default function TimetableTemplateSheet({ onClose }) {
  const user = useAuthStore((s) => s.user)
  const templates = useTimetableTemplatesStore((s) => s.templates)
  const loading = useTimetableTemplatesStore((s) => s.loading)
  const importTimetable = useSchoolStore((s) => s.importTimetable)

  const [term, setTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [mode, setMode] = useState('browse') // 'browse' | 'publish'
  const [importResult, setImportResult] = useState(null)

  const [pubName, setPubName] = useState('')
  const [pubSchool, setPubSchool] = useState('')
  const [pubLevel, setPubLevel] = useState('ม.4')
  const [published, setPublished] = useState(false)

  useEffect(() => {
    useTimetableTemplatesStore.getState().loadLatest()
  }, [])

  const visible = levelFilter ? templates.filter((t) => t.classLevel === levelFilter) : templates

  function handleImport(template) {
    try {
      const result = importTimetable(fromTimetableTemplate(template))
      setImportResult({ id: template.id, ...result })
    } catch {
      window.alert('ตารางนี้ใช้ไม่ได้ (schema ไม่รองรับ)')
    }
  }

  async function handlePublish() {
    if (!pubName.trim() || !pubSchool.trim()) return
    await useTimetableTemplatesStore.getState().publishTemplate({
      name: pubName.trim(), schoolName: pubSchool.trim(), classLevel: pubLevel,
    })
    setPublished(true)
  }

  return (
    <Popup variant="sheet" size="md" maxHeight="max-h-[85vh]" onClose={onClose}>
      <div className="px-5 pb-6 overflow-y-auto">
        <p className="pixel-font text-[10px] text-center text-ink mb-3">โหลดตารางเรียน</p>

        {mode === 'browse' ? (
          <>
            {/* Search */}
            <div className="flex gap-2 mb-3">
              <input
                aria-label="ค้นหาโรงเรียน"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="ชื่อโรงเรียน..."
                className="neo-input thai-font flex-1 px-3 py-2 text-sm"
              />
              <button
                aria-label="ค้นหา"
                onClick={() => useTimetableTemplatesStore.getState().searchBySchool(term)}
                className="neo-btn w-10 rounded-lg bg-brand-soft flex items-center justify-center text-brand-strong"
              >
                <Search size={16} />
              </button>
            </div>

            {/* Class-level chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
              {CLASS_LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevelFilter((prev) => (prev === lv ? null : lv))}
                  className={`shrink-0 px-3 py-1 rounded-full thai-font text-xs border-2 ${
                    levelFilter === lv ? 'border-ink bg-brand-soft text-brand-strong' : 'border-ink/20 text-ink-soft'
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>

            {/* List */}
            {loading && templates.length === 0 ? (
              <p className="thai-font text-center text-sm text-ink-soft py-8">กำลังโหลด...</p>
            ) : visible.length === 0 ? (
              <p className="thai-font text-center text-sm text-ink-soft py-8">ยังไม่มีตารางของโรงเรียนนี้ — เป็นคนแรกที่แชร์เลย!</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((t) => (
                  <li key={t.id} className="neo-card p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 min-w-0">
                        <span className="thai-font text-sm text-ink block truncate">{t.name}</span>
                        <span className="thai-font text-[11px] text-ink-soft">{t.schoolName} · {t.classLevel} · {t.subjects.length} วิชา</span>
                      </span>
                      {t.createdBy === user?.uid && (
                        <button
                          aria-label="ลบตาราง"
                          onClick={() => useTimetableTemplatesStore.getState().deleteTemplate(t.id)}
                          className="text-ink-soft hover:text-danger p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {importResult?.id === t.id ? (
                        <span className="thai-font text-xs text-brand-strong flex items-center gap-1">
                          <CheckCircle2 size={14} /> เพิ่ม {importResult.added} วิชา{importResult.skipped > 0 ? ` (ข้าม ${importResult.skipped})` : ''}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImport(t)}
                          className="neo-btn rounded-lg bg-brand-strong px-3 py-1.5 thai-font text-xs text-white shrink-0"
                        >
                          ใช้ตารางนี้
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setMode('publish')}
              className="mt-4 w-full neo-btn rounded-xl border-2 border-dashed border-brand/40 py-2.5 thai-font text-sm text-brand-strong flex items-center justify-center gap-2"
            >
              <Share2 size={14} /> แชร์ตารางเรียนของฉัน
            </button>
          </>
        ) : published ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-brand-strong" />
            <p className="thai-font text-sm text-ink">เผยแพร่ตารางเรียนแล้ว ขอบคุณที่ช่วยเพื่อน ๆ!</p>
            <button onClick={() => { setPublished(false); setMode('browse'); useTimetableTemplatesStore.getState().loadLatest() }} className="thai-font text-xs text-brand-strong underline">
              กลับไปดูตารางทั้งหมด
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="flex flex-col thai-font text-[11px] text-ink-soft">
              ชื่อตาราง
              <input aria-label="ชื่อตาราง" value={pubName} onChange={(e) => setPubName(e.target.value)} placeholder="เช่น ม.5/1 สายวิทย์" className="neo-input px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col thai-font text-[11px] text-ink-soft">
              ชื่อโรงเรียน
              <input aria-label="ชื่อโรงเรียน" value={pubSchool} onChange={(e) => setPubSchool(e.target.value)} className="neo-input px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col thai-font text-[11px] text-ink-soft">
              ระดับชั้น
              <select aria-label="ระดับชั้น" value={pubLevel} onChange={(e) => setPubLevel(e.target.value)} className="neo-input px-3 py-2 text-sm">
                {CLASS_LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
              </select>
            </label>
            <p className="thai-font text-[11px] text-ink-soft">ตารางวิชา + คาบเรียนปัจจุบันของคุณจะถูกแชร์ (ไม่รวมการบ้านและโน้ต)</p>
            <button onClick={handlePublish} className="neo-btn w-full rounded-xl bg-brand-strong py-2.5 pixel-font text-[10px] text-white">
              เผยแพร่
            </button>
            <button onClick={() => setMode('browse')} className="w-full thai-font text-xs text-ink-soft py-1">
              ย้อนกลับ
            </button>
          </div>
        )}
      </div>
    </Popup>
  )
}
