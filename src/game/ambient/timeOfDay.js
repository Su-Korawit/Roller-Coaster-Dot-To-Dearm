// Time-of-day phases in Thai wall-clock time (Asia/Bangkok), whatever the host zone.

const BANGKOK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// morning 05:00–09:59 · day 10:00–16:29 · golden 16:30–18:59 · night 19:00–04:59
export function phaseAt(date) {
  const parts = Object.fromEntries(BANGKOK.formatToParts(date).map((p) => [p.type, p.value]))
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  if (minutes >= 5 * 60 && minutes < 10 * 60) return 'morning'
  if (minutes >= 10 * 60 && minutes < 16 * 60 + 30) return 'day'
  if (minutes >= 16 * 60 + 30 && minutes < 19 * 60) return 'golden'
  return 'night'
}

// Overlay tint applied over a scene per phase.
export const PHASE_TINT = {
  morning: { color: '#FFE7C2', alpha: 0.1 },
  day: { color: '#FFFFFF', alpha: 0 },
  golden: { color: '#F6BFA6', alpha: 0.18 },
  night: { color: '#2B2550', alpha: 0.35 },
}
