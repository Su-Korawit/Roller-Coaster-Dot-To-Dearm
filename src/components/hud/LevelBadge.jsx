import { levelProgress } from '../../utils/level'

// MMO-style portrait extras for the Home HUD: a wooden coin with the level number
// pinned to the avatar's corner, and a thin XP bar underneath. Absolutely
// positioned inside a `relative` avatar wrapper; renders nothing until the
// student has earned XP so brand-new accounts see a clean HUD.
export default function LevelBadge({ xp = 0 }) {
  const safe = Number.isFinite(xp) ? xp : 0
  if (safe <= 0) return null
  const p = levelProgress(safe)
  const pct = Math.round(p.ratio * 100)

  return (
    <>
      <span
        className="rpg-coin absolute -bottom-1.5 -right-2 pixel-font text-[9px] text-ink pointer-events-none"
        style={{ minWidth: '1.5rem', height: '1.5rem' }}
        data-testid="level-coin"
        aria-label={`เลเวล ${p.level}`}
      >
        {p.level}
      </span>
      <span
        className="rpg-bar absolute left-0 right-0 pointer-events-none"
        style={{ top: 'calc(100% + 6px)', height: '9px', '--pct': pct }}
        role="progressbar"
        aria-label="ความคืบหน้าเลเวล"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <i />
      </span>
    </>
  )
}
