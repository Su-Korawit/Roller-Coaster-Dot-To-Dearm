import { useState } from 'react'
import { useTcasRounds } from '../../hooks/useMytcas'

const num = (v) => (v == null || v === '' || Number(v) === 0 ? null : v)

function ScoreBars({ scores }) {
  return (
    <div className="space-y-2">
      {scores.map((c, i) => {
        const w = c.weight ?? c.percent ?? 0
        return (
          <div key={c.key ?? i}>
            <div className="flex justify-between thai-font text-xs text-ink-soft">
              <span>{c.label ?? c.name ?? c.subject ?? `เกณฑ์ ${i + 1}`}</span>
              <span>{w}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-paper">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, w)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// One admission project inside a round (the API groups them: round.projects[]).
function ProjectBlock({ project }) {
  const facts = [
    num(project.seats) != null && `รับ ${project.seats} คน`,
    num(project.min_gpax) != null && `GPAX ขั้นต่ำ ${project.min_gpax}`,
    num(project.min_total_score) != null && `คะแนนรวมขั้นต่ำ ${project.min_total_score}`,
  ].filter(Boolean)
  return (
    <div className="rounded-lg bg-paper/60 px-3 py-2 space-y-2">
      {project.project_name_th && <p className="thai-font text-sm font-semibold text-ink">{project.project_name_th}</p>}
      {facts.length > 0 && <p className="thai-font text-xs text-ink-soft">{facts.join(' · ')}</p>}
      {project.scores?.length > 0 && <ScoreBars scores={project.scores} />}
      {project.condition && <p className="thai-font text-xs text-ink-soft whitespace-pre-line">เงื่อนไข: {project.condition}</p>}
      {project.interview_location && <p className="thai-font text-xs text-ink-soft">สัมภาษณ์/สอบ: {project.interview_location}</p>}
      {project.link && (
        <a href={project.link} target="_blank" rel="noopener noreferrer" className="thai-font text-xs text-brand-strong underline">
          ดูประกาศของมหาวิทยาลัย
        </a>
      )}
    </div>
  )
}

function RoundCard({ round, expanded, onToggle }) {
  // Real API shape: { round, round_name_th, seats_total, projects: [...] }.
  // Older shape (name / quota / criteria) is still understood.
  const projects = round.projects ?? []
  const criteria = round.criteria ?? round.weighted_criteria ?? []
  const title = round.round_name_th
    ? `รอบ ${round.round} · ${round.round_name_th}`
    : (round.name ?? `รอบ ${round.round}`)
  const subtitle = round.seats_total
    ? `${projects.length > 1 ? `${projects.length} โครงการ · ` : ''}รับรวม ${round.seats_total} คน`
    : (round.quota != null ? `โควตา ${round.quota}% · GPA ขั้นต่ำ ${round.minGpa ?? round.min_gpa ?? '—'}` : null)
  return (
    <div className="rounded-xl border-2 border-line/50 bg-paper overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          {subtitle && <p className="thai-font text-xs text-ink-soft">{subtitle}</p>}
        </div>
        <span className="text-ink-soft">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-line/30 px-4 py-3 space-y-3">
          {projects.map((pr, i) => <ProjectBlock key={pr.project_id ?? i} project={pr} />)}
          {criteria.length > 0 && <ScoreBars scores={criteria} />}
          {projects.length === 0 && criteria.length === 0 && (
            <p className="thai-font text-xs text-ink-soft">รอบนี้ยังไม่มีรายละเอียดเกณฑ์ — ดูประกาศล่าสุดที่ mytcas.com</p>
          )}
        </div>
      )}
    </div>
  )
}

// Admission rounds detail for a selected program.
export default function ProgramDetail({ programId, programName, onBack, onConfirm }) {
  const { rounds, announced, tcasYear, loading } = useTcasRounds(programId)
  const [expandedId, setExpandedId] = useState(null)

  return (
    <section className="onboarding-bg flex h-full flex-col">
      <div className="shrink-0 px-6 pt-4">
        <p className="thai-font text-xs text-ink-soft">หลักสูตร</p>
        <h1 className="thai-font text-lg font-bold text-ink leading-tight">{programName ?? programId}</h1>
        <h2 className="mt-4 text-xs font-bold tracking-widest text-brand-strong">ADMISSION ROUNDS</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
        {loading ? (
          <p className="thai-font text-center text-sm text-ink-soft">กำลังโหลดรอบรับสมัคร...</p>
        ) : rounds.length === 0 ? (
          <p className="thai-font text-center text-sm text-ink-soft">
            {announced === false && tcasYear
              ? `เกณฑ์รอบรับสมัคร TCAS${tcasYear - 2500} ยังไม่ประกาศ — โปรดติดตามประกาศจาก ทปอ.`
              : 'ไม่พบข้อมูลรอบรับสมัคร'}
          </p>
        ) : (
          rounds.map((round) => (
            <RoundCard
              key={round.id ?? round.round}
              round={round}
              expanded={expandedId === (round.id ?? round.round)}
              onToggle={() => setExpandedId((prev) => (prev === (round.id ?? round.round) ? null : (round.id ?? round.round)))}
            />
          ))
        )}
      </div>

      <div className="sticky bottom-0 bg-paper border-t-2 border-line px-6 py-3 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-btn flex-1 rounded-xl border-2 border-line bg-paper py-3 thai-font text-sm text-ink"
        >
          ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-btn flex-1 rounded-xl bg-brand-strong py-3 thai-font text-sm font-semibold text-white"
        >
          เลือกแล้ว
        </button>
      </div>
    </section>
  )
}
