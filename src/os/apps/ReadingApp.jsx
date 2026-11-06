import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { readingProgress } from '../lifeLogic'

// Reading: books with a page counter and progress bar.
export default function ReadingApp() {
  const { books, addBook, removeBook, setBookPage } = useLifeStore()
  const [title, setTitle] = useState('')
  const [total, setTotal] = useState('')

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <section className="px-card p-4 flex flex-col gap-3" aria-label="หนังสือที่กำลังอ่าน">
        <h3 className="thai-font font-bold">หนังสือที่กำลังอ่าน</h3>
        {books.length === 0 && <p className="thai-font text-sm text-ink-soft">เพิ่มหนังสือหรือชีทเล่มแรกของคุณ</p>}
        <ul className="flex flex-col gap-4">
          {books.map((b) => {
            const pct = readingProgress(b.page, b.totalPages)
            return (
              <li key={b.id} className="flex flex-col gap-1.5 thai-font text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate font-semibold">{b.title}</span>
                  <span className="text-xs font-bold text-brand-strong">{pct}%</span>
                  <button type="button" onClick={() => removeBook(b.id)} aria-label={`ลบ ${b.title}`} className="p-1"><X size={16} /></button>
                </div>
                <div className="h-2.5 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  อ่านถึงหน้า
                  <input
                    type="number"
                    value={b.page}
                    onChange={(e) => setBookPage(b.id, e.target.value)}
                    className="px-input h-8 w-20 px-2 text-sm text-ink"
                  />
                  / {b.totalPages || '?'}
                </label>
              </li>
            )
          })}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); addBook(title, total); setTitle(''); setTotal('') }} className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ชื่อหนังสือ" aria-label="ชื่อหนังสือ" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="จำนวนหน้า" aria-label="จำนวนหน้า" className="px-input h-10 px-3 text-sm w-28" />
          <button type="submit" aria-label="เพิ่มหนังสือ" className="px-btn px-3 bg-paper"><Plus size={18} /></button>
        </form>
      </section>
    </div>
  )
}
