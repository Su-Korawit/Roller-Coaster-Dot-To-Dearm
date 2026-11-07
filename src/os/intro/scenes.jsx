import Person from './Person'

// Intro scenes, drawn in code with theme tokens. Every scene gets `pose` (0 = starting frame,
// then one pose per caption) and moves its characters with CSS transitions between poses.
const GY = 206   // ground line
const fill = (t) => ({ fill: `var(--color-${t})` })
const stroke = (t) => ({ stroke: `var(--color-${t})` })

function Move({ x, y, ms = 1900, children }) {
  return <g style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform ${ms}ms ease-in-out` }}>{children}</g>
}

function Backdrop({ children }) {
  return (
    <>
      <rect x="-600" y="-400" width="1600" height="1060" style={fill('zone-sci-soft')} />
      <circle cx="334" cy="48" r="20" style={fill('zone-biz')} />
      <polygon points="0,206 90,120 170,206" style={fill('zone-soc-soft')} />
      <polygon points="110,206 220,100 330,206" style={fill('zone-soc-soft')} />
      <rect x="40" y="52" width="46" height="10" rx="5" style={fill('paper')} />
      <rect x="180" y="34" width="60" height="10" rx="5" style={fill('paper')} />
      {children}
    </>
  )
}

function Ground({ gap }) {
  return gap ? (
    <>
      <rect x={gap.from} y={GY} width={gap.to - gap.from} height={600} style={fill('ink-soft')} />
      <rect x="-600" y={GY} width={gap.from + 600} height={600} style={fill('zone-earth')} />
      <rect x={gap.to} y={GY} width={1000 - gap.to} height={600} style={fill('zone-earth')} />
      <rect x="-600" y={GY} width={gap.from + 600} height="4" style={fill('zone-earth-deep')} />
      <rect x={gap.to} y={GY} width={1000 - gap.to} height="4" style={fill('zone-earth-deep')} />
    </>
  ) : (
    <>
      <rect x="-600" y={GY} width="1600" height="600" style={fill('zone-earth')} />
      <rect x="-600" y={GY} width="1600" height="4" style={fill('zone-earth-deep')} />
    </>
  )
}

function Flag({ x, glow }) {
  return (
    <g>
      <circle cx={x + 16} cy={GY - 68} r="30" style={{ ...fill('zone-biz'), opacity: glow ? 0.35 : 0, transition: 'opacity 900ms' }} />
      <rect x={x} y={GY - 86} width="4" height="86" style={fill('ink')} />
      <polygon points={`${x + 4},${GY - 86} ${x + 38},${GY - 72} ${x + 4},${GY - 58}`} style={fill('zone-health')} />
    </g>
  )
}

// GOAL — someone stands in a box, climbs out, walks toward the goal.
export function GoalScene({ pose }) {
  const x = [120, 120, 220, 300][pose]
  const y = pose < 2 ? GY + 6 : GY
  return (
    <>
      <Backdrop />
      <Ground />
      <Flag x={346} glow={pose >= 3} />
      <Move x={x} y={y}>
        <g className={pose === 2 ? 'os-hop' : undefined}>
          <Person shirt="zone-sci" walking={pose === 3} />
        </g>
      </Move>
      <g style={{ ...stroke('ink'), strokeWidth: 3, ...fill('zone-biz') }}>
        <rect x="78" y="168" width="84" height="40" />
        <rect x="114" y="168" width="12" height="14" style={fill('zone-biz-deep')} />
      </g>
      <g style={{ ...stroke('ink'), strokeWidth: 3, ...fill('zone-biz-deep') }}>
        <rect x="78" y="162" width="32" height="6" style={{ transformOrigin: '78px 168px', transform: `rotate(${pose >= 2 ? -75 : -18}deg)`, transition: 'transform 900ms' }} />
        <rect x="130" y="162" width="32" height="6" style={{ transformOrigin: '162px 168px', transform: `rotate(${pose >= 2 ? 75 : 18}deg)`, transition: 'transform 900ms' }} />
      </g>
    </>
  )
}

// HABIT — walking, trips on a rock, gets back up, hops over it and keeps going.
export function HabitScene({ pose }) {
  const x = [30, 160, 200, 200, 330][pose]
  const rot = pose === 2 ? 78 : 0
  return (
    <>
      <Backdrop />
      <Ground />
      {[70, 120, 270, 310].map((px) => <rect key={px} x={px} y={GY + 14} width="22" height="5" rx="2" style={fill('zone-earth-deep')} />)}
      <polygon points="228,206 236,188 256,184 266,206" strokeWidth="3" strokeLinejoin="round" style={{ ...fill('ink-soft'), ...stroke('ink') }} />
      <Flag x={356} glow={pose >= 4} />
      <Move x={x} y={GY} ms={pose === 1 || pose === 4 ? 2100 : 700}>
        <g style={{ transformOrigin: '0px 0px', transform: `rotate(${rot}deg)`, transition: 'transform 600ms ease-in' }}>
          <g className={pose === 4 ? 'os-hop' : undefined}>
            <Person shirt="zone-earth" hair="zone-biz-deep" walking={pose === 1 || pose === 4} />
          </g>
        </g>
      </Move>
      <g style={{ opacity: pose === 2 ? 1 : 0, transition: 'opacity 300ms' }}>
        <rect x="214" y="96" width="8" height="26" rx="3" style={fill('danger')} />
        <rect x="214" y="128" width="8" height="8" rx="3" style={fill('danger')} />
      </g>
      <g style={{ opacity: pose === 3 ? 1 : 0, transition: 'opacity 500ms' }}>
        {[[180, 130], [236, 120], [210, 100]].map(([sx, sy], i) => (
          <rect key={i} x={sx} y={sy} width="8" height="8" className="os-bob" style={{ ...fill('zone-biz'), animationDelay: `${i * 0.2}s` }} />
        ))}
      </g>
    </>
  )
}

// COMMUNITY — stuck in a pit alone; friends walk in, pull you out, you all walk on together.
export function CommunityScene({ pose }) {
  const pit = { from: 175, to: 225 }
  const me = { x: [200, 200, 200, 200, 310][pose], y: pose < 3 ? GY + 44 : GY }
  const a = { x: [-30, -30, 150, 150, 250][pose] }
  const b = { x: [430, 430, 250, 250, 370][pose] }
  const walkIn = pose === 2
  return (
    <>
      <Backdrop />
      <Ground gap={pit} />
      <Move x={me.x} y={me.y} ms={pose === 3 ? 1500 : 2100}>
        <Person shirt="zone-soc" hair="zone-biz-deep" walking={pose === 4} />
      </Move>
      <Move x={a.x} y={GY} ms={2000}>
        <Person shirt="zone-health" hair="ink" walking={walkIn || pose === 4} reach={pose === 3} facing={1} />
      </Move>
      <Move x={b.x} y={GY} ms={2000}>
        <Person shirt="zone-biz" hair="brand-strong" walking={walkIn || pose === 4} reach={pose === 3} facing={pose >= 4 ? 1 : -1} />
      </Move>
      <g style={{ opacity: pose <= 1 ? 1 : 0, transition: 'opacity 400ms' }}>
        {[190, 200, 210].map((cx, i) => <circle key={cx} cx={cx} cy="150" r="3" className="os-bob" style={{ ...fill('ink-soft'), animationDelay: `${i * 0.2}s` }} />)}
      </g>
      <g style={{ opacity: pose >= 4 ? 1 : 0, transition: 'opacity 700ms' }}>
        <path d="M300 128 c-8 -10 -22 2 -10 12 l10 9 l10 -9 c12 -10 -2 -22 -10 -12 z" style={fill('zone-health')} className="os-bob" />
      </g>
    </>
  )
}

