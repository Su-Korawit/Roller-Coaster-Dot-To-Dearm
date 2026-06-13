// Stat pill for 🔥 streak / 💰 coins used in the HomePage HUD and Chat.
// icon: emoji or node; count: number; tone: "fire" | "coin" | "neutral"
const TONES = {
  fire:    'bg-orange-50 text-orange-600',
  coin:    'bg-yellow-50 text-yellow-600',
  neutral: 'bg-white/80 text-gray-600',
}

export default function StatBadge({ icon, count, tone = 'neutral' }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${TONES[tone]}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{count}</span>
    </div>
  )
}
