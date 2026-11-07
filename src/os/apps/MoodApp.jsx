import { useEffect, useMemo, useRef, useState } from 'react'
import { Frown, Meh, Smile, Laugh, Sparkles, Flame } from 'lucide-react'
import { useUserStore } from '../../stores/useUserStore'
import { todayKey } from '../lifeLogic'
import { MOODS, moodByDate, moodFrequency, moodLabel, moodWeeks } from '../moodLogic'

const ICONS = { 1: Frown, 2: Meh, 3: Smile, 4: Laugh, 5: Sparkles }
// One colour per mood (pink → amber → blue → green → deep green), empty days are plain grey.
const LEVEL_BG = {
  0: 'var(--color-mist)',
  1: 'var(--color-accent-pink)',
  2: 'var(--color-zone-biz)',
  3: 'var(--color-zone-soc)',
  4: 'var(--color-zone-earth)',
  5: 'var(--color-zone-earth-deep)',
}
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const ROW_LABEL = ['', 'จ', '', 'พ', '', 'ศ', '']
const thaiDay = (k) => new Date(`${k}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

// Mood: the daily "how do you feel" check-in, taken out of the game. One tap a day (you can change it
// until midnight); every day becomes a square on a GitHub-style grid, so you see how often you felt what.
export default function MoodApp() {
  const notes = useUserStore((s) => s.feelingNotes)
  const streak = useUserStore((s) => s.streak)
  const bestStreak = useUserStore((s) => s.bestStreak)
  const recordMood = useUserStore((s) => s.recordMood)
  const today = todayKey()
  const byDate = useMemo(() => moodByDate(notes), [notes])
  const weeks = useMemo(() => moodWeeks(today, 30), [today])
  const freq = useMemo(() => moodFrequency(notes, today, 30), [notes, today])
  const current = byDate[today] ?? 0
  const scroller = useRef(null)
  const [msg, setMsg] = useState('')

  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth }, [])

  function pick(level) {
    const first = !current
    recordMood(level, today)
    setMsg(first ? `บันทึกแล้ว วันนี้รู้สึก "${moodLabel(level)}"` : `เปลี่ยนเป็น "${moodLabel(level)}" แล้ว`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col gap-5">
      <section className="px-card p-4 flex flex-col gap-3 bg-brand-soft" aria-label="เช็กอินวันนี้">
        <h3 className="thai-font font-bold">วันนี้รู้สึกยังไงบ้าง</h3>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="อารมณ์วันนี้">
          {MOODS.map(({ level, label }) => {
            const Icon = ICONS[level]
            const on = current === level
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(level)}
                className={`px-btn py-2 flex flex-col items-center gap-1 thai-font text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${on ? 'bg-brand-strong text-white' : 'bg-paper'}`}
              >
                <Icon size={24} aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </div>
        {msg && <p role="status" className="thai-font text-sm text-brand-strong">{msg}</p>}
        <p className="thai-font text-xs text-ink-soft flex items-center gap-1.5">
          <Flame size={14} aria-hidden="true" /> เช็กอินต่อเนื่อง {streak ?? 0} วัน · สูงสุด {bestStreak ?? 0} วัน
        </p>
      </section>

      <section className="px-card p-3 flex flex-col gap-2" aria-label="ปฏิทินอารมณ์">
        <h3 className="thai-font font-bold text-sm">ความถี่อารมณ์ (30 สัปดาห์ล่าสุด)</h3>
        <div className="flex gap-2">
          <div className="flex flex-col gap-[3px] pt-[18px] thai-font text-xs text-ink-soft shrink-0" aria-hidden="true">
            {ROW_LABEL.map((l, i) => <span key={i} className="h-4 leading-4">{l}</span>)}
          </div>
          <div ref={scroller} className="os-pages overflow-x-auto flex-1 min-w-0 pb-1">
            <div className="flex gap-[3px] w-max">
              {weeks.map((week, wi) => {
                const first = week.find(Boolean)
                const prevFirst = wi > 0 ? weeks[wi - 1].find(Boolean) : null
                const m = first ? Number(first.slice(5, 7)) - 1 : -1
                const pm = prevFirst ? Number(prevFirst.slice(5, 7)) - 1 : -1
                return (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    <span className="h-[15px] thai-font text-xs text-ink-soft leading-[15px] whitespace-nowrap" aria-hidden="true">{m !== pm && m >= 0 ? MONTHS[m] : ''}</span>
                    {week.map((k, di) => {
                      if (!k) return <span key={di} className="w-4 h-4" />
                      const level = byDate[k] ?? 0
                      const title = `${thaiDay(k)}${level ? ` · ${moodLabel(level)}` : ' · ยังไม่ได้เช็กอิน'}`
                      return (
                        <span
                          key={k}
                          role="img"
                          aria-label={title}
                          title={title}
                          className={`w-4 h-4 rounded-[3px] border ${k === today ? 'border-ink' : 'border-transparent'}`}
                          style={{ background: LEVEL_BG[level] }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <ul className="flex items-center gap-x-3 gap-y-1 flex-wrap thai-font text-xs text-ink-soft">
          {MOODS.map(({ level, label }) => (
            <li key={level} className="inline-flex items-center gap-1"><i className="w-3.5 h-3.5 rounded-[3px]" style={{ background: LEVEL_BG[level] }} /> {label}</li>
          ))}
          <li className="inline-flex items-center gap-1"><i className="w-3.5 h-3.5 rounded-[3px] border border-line-soft" style={{ background: LEVEL_BG[0] }} /> ยังไม่เช็กอิน</li>
        </ul>
      </section>

      <section className="px-card p-4 flex flex-col gap-2" aria-label="สรุป 30 วัน">
        <h3 className="thai-font font-bold text-sm">30 วันที่ผ่านมา</h3>
        {freq.total === 0 ? (
          <p className="thai-font text-sm text-ink-soft">ยังไม่มีข้อมูล เช็กอินวันนี้เป็นวันแรกได้เลย</p>
        ) : (
          <>
            <p className="thai-font text-sm">เช็กอิน {freq.total} วัน · อารมณ์เฉลี่ย {freq.average} จาก 5</p>
            <ul className="flex flex-col gap-1.5">
              {MOODS.map(({ level, label }) => (
                <li key={level} className="flex items-center gap-2 thai-font text-xs">
                  <span className="w-16 shrink-0">{label}</span>
                  <span className="flex-1 h-3 rounded-full bg-mist overflow-hidden">
                    <span className="block h-full" style={{ width: `${(freq.counts[level] / freq.total) * 100}%`, background: LEVEL_BG[level] }} />
                  </span>
                  <span className="w-12 text-right text-ink-soft tabular-nums">{freq.counts[level]} วัน</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
