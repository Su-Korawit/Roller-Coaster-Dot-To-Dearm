import { useState } from 'react'
import { seatsFor } from '../../utils/openHouseIndex'
import ProjectCard from './ProjectCard'

const initials = (name = '') => name.replace(/มหาวิทยาลัย|สถาบัน/g, '').trim().slice(0, 2) || '·'

function Logo({ university }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="w-10 h-10 border-2 border-line rounded-ui bg-mist grid place-items-center overflow-hidden shrink-0 pixel-font text-xs text-ink" aria-hidden="true">
      {university.logoUrl && !broken
        ? <img src={university.logoUrl} alt="" loading="lazy" className="w-full h-full object-contain" onError={() => setBroken(true)} />
        : initials(university.nameTh)}
    </span>
  )
}

// One university in the list: logo, name, a program summary and the seats of the chosen round.
// Open it for its programs and their projects, each program with "+ เพิ่มเข้าแผน".
export default function UniversityRow({ university, round, zone, expanded, onToggle, onAdd }) {
  const programs = university.programs ?? []
  const summary = programs.length === 1
    ? programs[0].nameTh
    : `${programs.length} หลักสูตร`
  const seats = seatsFor(university, round)

  return (
    <li className="border-b border-dashed border-hairline">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full grid grid-cols-[40px_1fr_auto] gap-3 items-center px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
        style={expanded ? { background: zone.soft } : undefined}
      >
        <Logo university={university} />
        <span className="min-w-0">
          <span className="thai-font block text-sm font-bold text-ink leading-snug">{university.nameTh}</span>
          <span className="thai-font block text-xs text-ink-soft leading-snug truncate">{summary}</span>
        </span>
        <span className="text-right">
          <b className="pixel-font block text-lg leading-none text-ink">{seats}</b>
          <span className="thai-font text-xs text-ink-soft" title="รวมทุกโครงการ บางโครงการใช้โควตาร่วมกัน ตัวเลขจริงอาจน้อยกว่า">ที่นั่งรวม*</span>
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-3" style={{ background: zone.soft }}>
          {programs.map((program) => {
            const projects = program.rounds?.find((r) => r.round === round)?.projects ?? []
            return (
              <section key={program.programId} aria-label={program.nameTh} className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="thai-font text-sm font-bold text-ink leading-snug">{program.nameTh}</h3>
                    {program.typeTh && <p className="thai-font text-xs text-ink-soft">{program.typeTh}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(university, program)}
                    className="px-btn h-9 px-3 text-xs font-bold bg-leaf text-ink shrink-0"
                  >
                    + เพิ่มเข้าแผน
                  </button>
                </div>
                {projects.map((project, i) => (
                  <ProjectCard key={`${program.programId}-${i}`} project={project} costText={program.costText} zone={zone} />
                ))}
              </section>
            )
          })}
        </div>
      )}
    </li>
  )
}
