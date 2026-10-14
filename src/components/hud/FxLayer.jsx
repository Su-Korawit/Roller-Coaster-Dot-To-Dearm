import { useFxStore } from '../../stores/useFxStore'

const STYLE = {
  xp: 'text-brand-strong',
  levelup: 'text-warn-strong',
  coin: 'text-warn-strong',
  info: 'text-ink',
}

// Floating "+25 XP" / "LEVEL UP!" toasts. Non-interactive (pointer-events none)
// and announced politely to screen readers; motion is stepped and removed under
// prefers-reduced-motion (see .animate-fx-rise).
export default function FxLayer() {
  const toasts = useFxStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-28 z-40 flex -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid={`fx-${t.kind}`}
          className={`neo-card animate-fx-rise pixel-font whitespace-nowrap px-4 py-2 ${
            t.kind === 'levelup' ? 'text-sm' : 'text-[11px]'
          } ${STYLE[t.kind] ?? STYLE.info}`}
        >
          {t.kind === 'levelup' && <span aria-hidden="true">✨ </span>}
          {t.text}
        </div>
      ))}
    </div>
  )
}
