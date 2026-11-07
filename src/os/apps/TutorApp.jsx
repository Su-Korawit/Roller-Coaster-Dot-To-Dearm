import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { TUTORING_SITES, searchTutoring, tutoringAreas } from '../../data/tutoringSites'

// Tutor: directory of tutoring institutes' own websites. Most block embedding, so each opens in a new tab.
export default function TutorApp() {
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('all')
  const areas = useMemo(() => tutoringAreas(), [])
  const list = useMemo(() => searchTutoring(query, area), [query, area])
  const chips = [['all', 'ทั้งหมด'], ['online', 'ออนไลน์/ทั่วประเทศ'], ...areas.map((a) => [a, a])]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-4">
      <label className="relative block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`ค้นหาจาก ${TUTORING_SITES.length} สถาบัน`}
          aria-label="ค้นหาสถาบันกวดวิชา"
          className="w-full pl-9 pr-3 py-2 rounded-ui border-2 border-line-soft bg-paper text-sm thai-font focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="กรองตามพื้นที่">
        {chips.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setArea(id)}
            aria-pressed={area === id}
            className={`shrink-0 px-btn px-3 py-1 thai-font text-xs font-semibold ${area === id ? 'bg-brand-strong text-white' : 'bg-paper'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="thai-font text-sm text-ink-soft text-center py-8">ไม่พบสถาบันที่ค้นหา</p>}
      <ul className="flex flex-col gap-2">
        {list.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="px-card p-3 bg-paper flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <span className="min-w-0 flex-1">
                <span className="thai-font text-sm font-bold block break-words">{s.name}</span>
                <span className="thai-font text-xs text-ink-soft block">{s.area || 'ออนไลน์/ทั่วประเทศ'}</span>
              </span>
              <ExternalLink size={16} className="text-ink-soft shrink-0" aria-label="เปิดในแท็บใหม่" />
            </a>
          </li>
        ))}
      </ul>
      <p className="thai-font text-xs text-ink-soft">รวบรวมจากเว็บไซต์ของผู้ให้บริการเอง ใช้ดูหลักสูตรและสาขา ควรตรวจรายละเอียดและค่าใช้จ่ายกับสถาบันอีกครั้ง</p>
    </div>
  )
}
