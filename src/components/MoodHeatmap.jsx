// ─────────────────────────────────────────────────────────────────────────────
// MoodHeatmap — GitHub-style contribution grid for daily feel check-ins.
// Shows the past 52 weeks (364 days) + today, left-to-right oldest→newest.
// Each cell is a day; color encodes the mood level (1–5) or empty.
// ─────────────────────────────────────────────────────────────────────────────

// Mood level → fill color (green scale, dark-mode inspired)
const LEVEL_COLORS = {
  0: '#2d333b', // no entry
  1: '#1a1f27', // very low
  2: '#0e4429', // low
  3: '#006d32', // neutral
  4: '#26a641', // good
  5: '#39d353', // great
}

const LEVEL_LABELS = ['', 'Rough', 'Low', 'Okay', 'Good', 'Great!']

// Normalize a JS Date to a local 'YYYY-MM-DD' string
function toLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Build a map of dateStr → feel level from feelingNotes
function buildMap(notes) {
  const m = {}
  for (const n of notes) {
    m[n.date] = n.feel
  }
  return m
}

// Build a 7-row × 53-col grid of YYYY-MM-DD strings (weeks as columns)
// Starting from the Sunday >= 364 days ago, ending today
function buildGrid() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Walk back to nearest past Sunday
  const startDay = new Date(today)
  startDay.setDate(today.getDate() - 364)
  const dow = startDay.getDay()
  if (dow !== 0) startDay.setDate(startDay.getDate() - dow)

  const weeks = []
  const cur = new Date(startDay)
  while (cur <= today) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(cur <= today ? toLocalDate(new Date(cur)) : null)
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function MoodHeatmap({ feelingNotes = [] }) {
  const dataMap = buildMap(feelingNotes)
  const weeks = buildGrid()

  // Derive month label positions (first week of each month in the grid)
  const monthLabels = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const first = week.find(Boolean)
    if (!first) return
    const m = parseInt(first.slice(5, 7), 10) - 1
    if (m !== lastMonth) {
      monthLabels.push({ wi, label: MONTH_NAMES[m] })
      lastMonth = m
    }
  })

  const CELL = 10   // cell size px
  const GAP = 2     // gap px
  const STEP = CELL + GAP

  const svgWidth = weeks.length * STEP
  const svgHeight = 7 * STEP + 14 // extra for month labels above

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={svgWidth}
        height={svgHeight}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Mood heatmap"
      >
        {/* Month labels */}
        {monthLabels.map(({ wi, label }) => (
          <text
            key={`m-${wi}`}
            x={wi * STEP}
            y={10}
            fill="#636e7b"
            fontSize={8}
            fontFamily="'Press Start 2P', monospace"
          >
            {label}
          </text>
        ))}

        {/* Day cells */}
        {weeks.map((week, wi) =>
          week.map((dateStr, di) => {
            if (!dateStr) return null
            const level = dataMap[dateStr] ?? 0
            const color = LEVEL_COLORS[level] ?? LEVEL_COLORS[0]
            const today = toLocalDate(new Date())
            const isToday = dateStr === today
            return (
              <rect
                key={dateStr}
                x={wi * STEP}
                y={14 + di * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                ry={2}
                fill={color}
                stroke={isToday ? '#e3b341' : 'none'}
                strokeWidth={isToday ? 1.5 : 0}
              >
                <title>{dateStr}{level ? ` — ${LEVEL_LABELS[level]}` : ''}</title>
              </rect>
            )
          })
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end pr-1">
        <span className="pixel-font text-[6px] text-gray-500">Less</span>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <div
            key={l}
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: LEVEL_COLORS[l] }}
          />
        ))}
        <span className="pixel-font text-[6px] text-gray-500">More</span>
      </div>
    </div>
  )
}
