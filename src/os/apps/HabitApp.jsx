import { useState } from 'react'
import { Plus, X, Flame } from 'lucide-react'
import { useLifeStore } from '../../stores/useLifeStore'
import { goalProgress, habitStreak, todayKey } from '../lifeLogic'

const TAGS = ['TGAT', 'A-LEVEL', 'อื่นๆ']

// Habit: today's plan (checklist with progress) + repeating habits with streaks.
export default function HabitApp() {
  const { tasks, habits, addTask, toggleTask, removeTask, addHabit, removeHabit, toggleHabitToday } = useLifeStore()
  const [text, setText] = useState('')
  const [tag, setTag] = useState(TAGS[0])
  const [habit, setHabit] = useState('')
  const today = todayKey()
  const todays = tasks.filter((t) => t.date === today)
  const pct = goalProgress(todays)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <section className="px-card p-4 flex flex-col gap-3" aria-label="แผนวันนี้">
        <div className="flex items-center justify-between">
          <h3 className="thai-font font-bold">แผนวันนี้</h3>
          <span className="thai-font text-sm font-bold text-brand-strong">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-leaf transition-all" style={{ width: `${pct}%` }} />
        </div>
        {todays.length === 0 && <p className="thai-font text-sm text-ink-soft">ลองเริ่มเลยดีกว่า — เพิ่มสิ่งแรกที่จะทำวันนี้</p>}
        <ul className="flex flex-col gap-2">
          {todays.map((t) => (
            <li key={t.id} className="flex items-center gap-2 thai-font text-sm">
              <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} aria-label={t.text} className="w-5 h-5" />
              <span className={`flex-1 min-w-0 truncate ${t.done ? 'line-through text-ink-soft' : ''}`}>{t.text}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-soft text-brand-strong font-bold">{t.tag}</span>
              <button type="button" onClick={() => removeTask(t.id)} aria-label={`ลบ ${t.text}`} className="p-1"><X size={16} /></button>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); addTask(text, tag); setText('') }} className="flex gap-2">
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="หมวด" className="px-input h-10 px-2 text-sm">
            {TAGS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="เช่น ทำข้อสอบ TGAT 1 ชุด" aria-label="งานวันนี้" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <button type="submit" aria-label="เพิ่มงาน" className="px-btn px-3 bg-paper"><Plus size={18} /></button>
        </form>
      </section>

      <section className="px-card p-4 flex flex-col gap-3" aria-label="นิสัย">
        <h3 className="thai-font font-bold">นิสัยประจำวัน</h3>
        {habits.length === 0 && <p className="thai-font text-sm text-ink-soft">สร้างนิสัย เช่น อ่านหนังสือ 30 นาที</p>}
        <ul className="flex flex-col gap-2">
          {habits.map((h) => {
            const done = h.doneDates.includes(today)
            const streak = habitStreak(h.doneDates, today)
            return (
              <li key={h.id} className="flex items-center gap-2 thai-font text-sm">
                <button
                  type="button"
                  onClick={() => toggleHabitToday(h.id)}
                  aria-pressed={done}
                  className={`px-btn px-3 py-1 text-xs font-bold ${done ? 'bg-zone-earth-soft text-zone-earth-deep' : 'bg-paper'}`}
                >
                  {done ? 'ทำแล้ว' : 'ทำวันนี้'}
                </button>
                <span className="flex-1 min-w-0 truncate">{h.name}</span>
                <span className="flex items-center gap-1 text-xs font-bold text-zone-biz-deep"><Flame size={14} />{streak}</span>
                <button type="button" onClick={() => removeHabit(h.id)} aria-label={`ลบ ${h.name}`} className="p-1"><X size={16} /></button>
              </li>
            )
          })}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); addHabit(habit); setHabit('') }} className="flex gap-2">
          <input value={habit} onChange={(e) => setHabit(e.target.value)} placeholder="นิสัยใหม่" aria-label="นิสัยใหม่" className="px-input h-10 px-3 text-sm flex-1 min-w-0" />
          <button type="submit" aria-label="เพิ่มนิสัย" className="px-btn px-3 bg-paper"><Plus size={18} /></button>
        </form>
      </section>
    </div>
  )
}
