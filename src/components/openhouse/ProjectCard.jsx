import { useState } from 'react'

// One admission project of a program in the chosen round: name, seats, minimum GPAX and the score
// weights as bars. The cost is shown verbatim (the data is free text) and expands when long.
const COST_CLIP = 60

export default function ProjectCard({ project, costText, zone }) {
  const scores = Array.isArray(project.scores) ? project.scores : []
  const name = project.nameTh ?? 'โครงการรับสมัคร'
  const [expanded, setExpanded] = useState(false)
  const longCost = typeof costText === 'string' && costText.length > COST_CLIP
  const cost = longCost && !expanded ? `${costText.slice(0, COST_CLIP)}…` : costText

  return (
    <div className="border-2 border-line bg-paper rounded-ui p-3 flex flex-col gap-1.5">
      <h4 className="thai-font text-sm font-bold text-ink">{name}</h4>
      <div className="thai-font text-xs text-ink-soft flex flex-wrap gap-x-4 gap-y-1">
        <span>รับ <b className="text-ink">{project.seats}</b> ที่นั่ง</span>
        {project.minGpax != null && <span>GPAX ขั้นต่ำ <b className="text-ink">{Number(project.minGpax).toFixed(2)}</b></span>}
        {project.interview && <span className="text-ink">มีสัมภาษณ์</span>}
      </div>
      {costText && (
        <p className="thai-font text-xs text-ink-soft">
          ค่าเทอม <b className="text-ink">{cost}</b>
          {longCost && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="ml-1 underline text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              {expanded ? 'ย่อ' : 'ดูเพิ่ม'}
            </button>
          )}
        </p>
      )}
      {scores.length > 0 && (
        <ul className="flex flex-col gap-1 mt-1" aria-label="น้ำหนักคะแนน">
          {scores.map((s) => (
            <li key={s.key} className="grid grid-cols-[minmax(0,110px)_1fr_36px] gap-2 items-center thai-font text-xs text-ink">
              <span className="truncate">{s.label ?? s.key}</span>
              <i className="h-2 border-2 border-line bg-paper rounded-full overflow-hidden block" aria-hidden="true">
                <b className="block h-full" style={{ width: `${Math.min(100, Math.max(0, s.weight))}%`, background: zone.color }} />
              </i>
              <span className="text-right">{s.weight}%</span>
            </li>
          ))}
        </ul>
      )}
      {/^https?:\/\//.test(project.link ?? '') && (
        <a href={project.link} target="_blank" rel="noopener noreferrer" className="thai-font text-xs font-bold text-brand-strong underline mt-1 w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          เปิดใน MyTCAS
        </a>
      )}
    </div>
  )
}
