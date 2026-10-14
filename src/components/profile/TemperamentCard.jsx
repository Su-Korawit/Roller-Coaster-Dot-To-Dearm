import { temperamentOf } from '../../constants/temperaments'
import { levelProgress } from '../../utils/level'

// Profile card: level from lifetime Focus XP plus the MBTI temperament perk.
// Level is hidden until the student has studied at least once, so new users are
// not greeted by an empty bar.
export default function TemperamentCard({ mbti, focusXp = 0 }) {
  const temperament = temperamentOf(mbti)
  const xp = Number.isFinite(focusXp) ? focusXp : 0
  if (!temperament && xp <= 0) return null
  const p = levelProgress(xp)

  return (
    <section aria-label="เลเวลและความสามารถ" className="neo-slab p-3 flex flex-col gap-2" data-testid="temperament-card">
      {xp > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="pixel-font text-[11px] text-ink">เลเวล {p.level}</span>
            <span className="thai-font text-[10px] text-ink/60">
              {p.next ? `${Math.floor(p.xp)} / ${p.next} XP` : 'เลเวลสูงสุด'}
            </span>
          </div>
          <div
            role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.ratio * 100)}
            className="mt-1 h-2.5 border-2 border-ink bg-surface rounded-full overflow-hidden"
          >
            <div className="h-full bg-brand" style={{ width: `${Math.round(p.ratio * 100)}%` }} />
          </div>
        </div>
      )}

      {temperament && (
        <div className="flex items-start gap-2">
          <span className="text-xl" aria-hidden="true">{temperament.emoji}</span>
          <div className="min-w-0">
            <div className="thai-font text-sm font-bold text-ink">
              {temperament.name} · {temperament.perk}
            </div>
            <div className="thai-font text-xs text-ink/70">{temperament.description}</div>
          </div>
        </div>
      )}
    </section>
  )
}
