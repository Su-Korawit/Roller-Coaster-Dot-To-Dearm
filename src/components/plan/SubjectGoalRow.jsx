const HOUR_MS = 3600000
const STEP = 5

// One exam subject across the whole plan: programs using it, hours studied against the goal, a
// bar, ± to change the goal and อ่าน to start a focus session for it.
export default function SubjectGoalRow({ subject, studiedMs, goal, busy, onRead, onGoal }) {
  const hours = studiedMs / HOUR_MS
  const pct = Math.min(100, Math.round((hours / goal) * 100))
  return (
    <li data-key={subject.key} className="px-slab p-2.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-center">
      <b className="thai-font text-sm text-ink">{subject.label}</b>
      <button
        type="button"
        aria-label={`อ่าน ${subject.label}`}
        disabled={busy}
        onClick={() => onRead(subject)}
        className="px-btn h-11 px-4 text-sm font-bold bg-paper text-ink row-span-2 disabled:opacity-50"
      >
        อ่าน
      </button>
      <span className="thai-font text-xs text-ink-soft flex items-center gap-1 flex-wrap">
        {`ใช้ใน ${subject.programs} หลักสูตร, ${Math.floor(hours)} / ${goal} ชม.`}
        <button type="button" aria-label={`ลดเป้า ${subject.label}`} onClick={() => onGoal(subject, goal - STEP)} className="px-btn w-8 h-8 text-sm font-bold bg-paper text-ink">−</button>
        <button type="button" aria-label={`เพิ่มเป้า ${subject.label}`} onClick={() => onGoal(subject, goal + STEP)} className="px-btn w-8 h-8 text-sm font-bold bg-paper text-ink">+</button>
      </span>
      <div role="progressbar" aria-label={`ชั่วโมงอ่าน ${subject.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="col-span-2 h-2 rounded-full border-2 border-hairline bg-paper overflow-hidden">
        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </li>
  )
}
