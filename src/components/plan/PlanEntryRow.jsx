import { useState } from 'react'
import { programName, universityName } from './entryNames'

const ROUND_OPTIONS = [
  { value: '', label: 'ยังไม่เลือกรอบ' },
  { value: '1', label: 'รอบ 1' },
  { value: '2', label: 'รอบ 2' },
  { value: '3', label: 'รอบ 3' },
  { value: '4', label: 'รอบ 4' },
]

// One program in the plan: rank (round 3), name, score chips and a drag handle; open it to tick
// and add to-dos, move it to another round or take it out. Drag props come from the round-3 list.
export default function PlanEntryRow({ entry, open, onOpen, onToggle, onAddItem, onRemoveItem, onMove, onRemove, dragProps, innerRef, draggableProps, dragging }) {
  const [text, setText] = useState('')
  const name = programName(entry)
  const chips = (entry.scores ?? []).filter((s) => s.weight > 0)

  const submit = () => {
    if (!text.trim()) return
    onAddItem(entry.id, text)
    setText('')
  }

  return (
    <li
      ref={innerRef}
      data-name={name}
      {...draggableProps}
      className={`rounded-ui border-2 bg-paper p-2 flex flex-col gap-2 ${dragging ? 'border-line shadow-px' : 'border-hairline'}`}
    >
      <div className="grid grid-cols-[1.5rem_1fr_auto] gap-2 items-center">
        <span className="pixel-font text-base text-ink text-center">{entry.rank ?? ''}</span>
        <button type="button" aria-label={`เปิดรายละเอียด ${name}`} aria-expanded={open} onClick={() => onOpen(entry.id)} className="text-left min-w-0">
          <b className="thai-font text-sm text-ink block leading-tight">{name}</b>
          <span className="thai-font text-xs text-ink-soft block truncate">{universityName(entry)}</span>
          {chips.length > 0 && (
            <span className="flex flex-wrap gap-1 mt-1">
              {chips.map((s) => (
                <em key={s.key} className="not-italic text-xs font-bold px-1.5 rounded-md bg-mist text-ink-soft">{`${s.label} ${s.weight}%`}</em>
              ))}
            </span>
          )}
        </button>
        {dragProps ? (
          <button type="button" aria-label={`ลากเพื่อเรียง ${name}`} {...dragProps} className="px-btn w-9 h-11 text-ink-soft bg-paper">⋮⋮</button>
        ) : (
          <span aria-hidden="true" className="w-9" />
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2 border-t-2 border-dashed border-hairline pt-2">
          {entry.checklist.length > 0 && (
            <ul className="flex flex-col gap-1">
              {entry.checklist.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 thai-font text-sm text-ink flex-1 min-h-8">
                    <input type="checkbox" aria-label={c.text} checked={c.done} onChange={() => onToggle(entry.id, c.id)} className="w-4 h-4" />
                    <span className={c.done ? 'line-through text-ink-soft' : ''}>{c.text}</span>
                  </label>
                  {c.source === 'user' && (
                    <button type="button" aria-label={`ลบ ${c.text}`} onClick={() => onRemoveItem(entry.id, c.id)} className="px-btn w-8 h-8 text-sm bg-paper text-ink">✕</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              aria-label="เพิ่มสิ่งที่ต้องทำ"
              value={text}
              maxLength={120}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              className="px-input h-10 px-2 text-sm flex-1 min-w-0"
            />
            <button type="button" onClick={submit} className="px-btn h-10 px-3 text-sm font-bold bg-paper text-ink">เพิ่ม</button>
          </div>
          <label className="flex items-center gap-2 thai-font text-xs text-ink-soft">
            ย้ายไปรอบ
            <select aria-label="ย้ายไปรอบ" value={entry.round == null ? '' : String(entry.round)} onChange={(e) => onMove(entry.id, e.target.value === '' ? null : Number(e.target.value))} className="px-input h-10 px-2 text-sm">
              {ROUND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => onRemove(entry.id)} className="px-btn h-10 px-3 text-sm font-bold bg-paper text-danger self-start">เอาออกจากแผน</button>
        </div>
      )}
    </li>
  )
}
