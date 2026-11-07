import { useState } from 'react'
import OsSheet from './OsSheet'
import { GUIDE_STEPS } from './guideContent'
import { findApp } from './apps'

// Welcome tour: opens once per device, and again from the "?" button on Home.
export default function OsGuide({ onClose, onOpenApp }) {
  const [i, setI] = useState(0)
  const step = GUIDE_STEPS[i]
  const last = i === GUIDE_STEPS.length - 1
  const app = step.open ? findApp(step.open) : null

  return (
    <OsSheet title="คู่มือใช้งาน" onClose={onClose}>
      <div className="flex flex-col gap-3 min-h-[220px]">
        <h3 className="thai-font font-bold text-base">{step.title}</h3>
        <p className="thai-font text-sm leading-relaxed">{step.text}</p>
        {app && (
          <button
            type="button"
            onClick={() => { onOpenApp(app); onClose() }}
            className="self-start px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            ลองเปิด {app.name}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="flex gap-1.5 flex-1" role="tablist" aria-label="ขั้นตอน">
          {GUIDE_STEPS.map((s, n) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`ขั้นที่ ${n + 1}`}
              onClick={() => setI(n)}
              className={`h-2.5 rounded-full bg-brand-strong transition-all ${n === i ? 'w-6' : 'w-2.5 opacity-30'}`}
            />
          ))}
        </div>
        {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper">ย้อนกลับ</button>}
        <button
          type="button"
          onClick={() => (last ? onClose() : setI(i + 1))}
          className="px-btn px-4 py-1.5 thai-font text-xs font-bold bg-brand-strong text-white"
        >
          {last ? 'เริ่มใช้งาน' : 'ถัดไป'}
        </button>
      </div>
      {!last && <button type="button" onClick={onClose} className="mt-3 thai-font text-xs text-ink-soft underline">ข้ามไปก่อน</button>}
    </OsSheet>
  )
}
