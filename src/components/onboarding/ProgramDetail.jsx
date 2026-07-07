import { useState } from 'react'
import { useTcasRounds } from '../../hooks/useMytcas'

function RoundCard({ round, expanded, onToggle }) {
  const criteria = round.criteria ?? round.weighted_criteria ?? []
  return (
    <div className="rounded-xl border-2 border-ink/25 bg-surface overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-ink">{round.name ?? `รอบ ${round.round}`}</p>
          {round.quota != null && (
            <p className="thai-font text-xs text-ink-soft">โควตา {round.quota}% · GPA ขั้นต่ำ {round.minGpa ?? round.min_gpa ?? '—'}</p>
          )}
        </div>
        <span className="text-ink-soft">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && criteria.length > 0 && (
        <div className="border-t border-ink/10 px-4 py-3 space-y-2">
          {criteria.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between thai-font text-xs text-ink-soft">
                <span>{c.name ?? c.subject ?? `เกณฑ์ ${i + 1}`}</span>
                <span>{c.weight ?? c.percent ?? ''}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-paper">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${c.weight ?? c.percent ?? 0}%` }}
                />
              </div>
            </div>
          ))}
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

      <div className="sticky bottom-0 bg-paper/95 border-t-2 border-ink px-6 py-3 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="neo-btn flex-1 rounded-xl border-2 border-ink bg-surface py-3 thai-font text-sm text-ink"
        >
          ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="neo-btn flex-1 rounded-xl bg-brand-strong py-3 thai-font text-sm font-semibold text-white"
        >
          เลือกแล้ว
        </button>
      </div>
    </section>
  )
}
