import { useState } from 'react'
import { useTcasRounds } from '../../hooks/useMytcas'

function RoundCard({ round, expanded, onToggle }) {
  const criteria = round.criteria ?? round.weighted_criteria ?? []
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-ink">{round.name ?? `รอบ ${round.round}`}</p>
          {round.quota != null && (
            <p className="text-xs text-gray-400">โควตา {round.quota}% · GPA ขั้นต่ำ {round.minGpa ?? round.min_gpa ?? '—'}</p>
          )}
        </div>
        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && criteria.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          {criteria.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{c.name ?? c.subject ?? `เกณฑ์ ${i + 1}`}</span>
                <span>{c.weight ?? c.percent ?? ''}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100">
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
  const { rounds, loading } = useTcasRounds(programId)
  const [expandedId, setExpandedId] = useState(null)

  return (
    <section className="onboarding-bg flex h-full flex-col">
      <div className="shrink-0 px-6 pt-4">
        <p className="text-xs text-gray-400">หลักสูตร</p>
        <h1 className="title-gradient pixel-font text-lg leading-tight">{programName ?? programId}</h1>
        <h2 className="mt-4 text-xs font-bold tracking-widest text-brand-strong">ADMISSION ROUNDS</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-gray-500">กำลังโหลดรอบรับสมัคร...</p>
        ) : rounds.length === 0 ? (
          <p className="text-center text-sm text-gray-500">ไม่พบข้อมูลรอบรับสมัคร</p>
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

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-white/60 px-6 py-3 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm text-gray-600"
        >
          ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-2xl bg-brand-strong text-white py-3 text-sm font-semibold"
        >
          เลือกแล้ว
        </button>
      </div>
    </section>
  )
}
