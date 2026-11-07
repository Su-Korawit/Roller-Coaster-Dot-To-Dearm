import Person from './Person'

// More intro scenes (same conventions as scenes.jsx): `pose` 0 = starting frame, then one per caption.
const GY = 206
const fill = (t) => ({ fill: `var(--color-${t})` })
const stroke = (t) => ({ stroke: `var(--color-${t})` })

function Move({ x, y, ms = 1900, children }) {
  return <g style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform ${ms}ms ease-in-out` }}>{children}</g>
}

function Backdrop() {
  return (
    <>
      <rect x="-600" y="-400" width="1600" height="1060" style={fill('zone-sci-soft')} />
      <circle cx="334" cy="48" r="20" style={fill('zone-biz')} />
      <polygon points="0,206 90,120 170,206" style={fill('zone-soc-soft')} />
      <polygon points="110,206 220,100 330,206" style={fill('zone-soc-soft')} />
      <rect x="40" y="52" width="46" height="10" rx="5" style={fill('paper')} />
      <rect x="180" y="34" width="60" height="10" rx="5" style={fill('paper')} />
      <rect x="-600" y={GY} width="1600" height="600" style={fill('zone-earth')} />
      <rect x="-600" y={GY} width="1600" height="4" style={fill('zone-earth-deep')} />
    </>
  )
}

// READING — walks to the desk, opens the book, the timer fills up.
export function ReadingScene({ pose }) {
  const x = [40, 190, 190, 190][pose]
  const open = pose >= 2
  const fillPct = [0, 0, 0.3, 1][pose]
  const C = 2 * Math.PI * 28
  return (
    <>
      <Backdrop />
      <Move x={x} y={GY} ms={pose === 1 ? 2000 : 800}>
        <Person shirt="zone-sci" hair="zone-biz-deep" walking={pose === 1} />
      </Move>
      <rect x="140" y="172" width="130" height="36" strokeWidth="3" style={{ ...fill('zone-biz-deep'), ...stroke('ink') }} />
      <g strokeWidth="2.5" style={stroke('ink')}>
        {open ? (
          <>
            <rect x="170" y="156" width="36" height="18" style={fill('paper')} />
            <rect x="206" y="156" width="36" height="18" style={fill('zone-biz-soft')} />
            {[162, 167].map((ly) => <line key={ly} x1="176" y1={ly} x2="200" y2={ly} strokeWidth="2" style={stroke('zone-soc')} />)}
          </>
        ) : (
          <rect x="178" y="160" width="48" height="12" style={fill('zone-health')} />
        )}
      </g>
      <g style={{ opacity: open ? 1 : 0.25, transition: 'opacity 600ms' }}>
        <circle cx="318" cy="110" r="28" fill="none" strokeWidth="8" style={stroke('zone-soc-soft')} />
        <circle
          cx="318" cy="110" r="28" fill="none" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 318 110)"
          style={{ ...stroke('zone-earth'), strokeDasharray: C, strokeDashoffset: C * (1 - fillPct), transition: 'stroke-dashoffset 1800ms ease-in-out' }}
        />
      </g>
      <g style={{ opacity: pose >= 3 ? 1 : 0, transition: 'opacity 500ms' }}>
        {[[250, 110], [290, 60], [352, 66]].map(([sx, sy], i) => (
          <rect key={i} x={sx} y={sy} width="8" height="8" className="os-bob" style={{ ...fill('zone-biz'), animationDelay: `${i * 0.2}s` }} />
        ))}
      </g>
    </>
  )
}

// SECRETARY — the assistant waves, a to-do bubble gets ticked off.
export function SecretaryScene({ pose }) {
  const ticks = [0, 0, 2, 3][pose]
  return (
    <>
      <Backdrop />
      <line x1="104" y1="108" x2="104" y2="122" strokeWidth="3" style={stroke('ink')} />
      <circle cx="104" cy="106" r="5" style={fill('zone-biz')} />
      <rect x="76" y="122" width="56" height="44" rx="10" strokeWidth="3" style={{ ...fill('zone-soc'), ...stroke('ink') }} />
      <rect x="86" y="164" width="36" height="42" rx="6" strokeWidth="3" style={{ ...fill('paper'), ...stroke('ink') }} />
      <circle cx="92" cy="142" r="5" style={fill('ink')} />
      <circle cx="116" cy="142" r="5" style={fill('ink')} />
      <path d="M94 154 q10 8 20 0" fill="none" strokeWidth="3" strokeLinecap="round" style={stroke('ink')} />
      <g style={{ transformOrigin: '128px 172px', transform: `rotate(${pose <= 1 ? -60 : 0}deg)`, transition: 'transform 700ms' }}>
        <rect x="126" y="170" width="8" height="28" rx="4" style={fill('zone-soc')} />
      </g>
      <g style={{ opacity: pose >= 1 ? 1 : 0, transform: `scale(${pose >= 1 ? 1 : 0.6})`, transformOrigin: '170px 150px', transition: 'opacity 500ms, transform 500ms' }}>
        <rect x="158" y="40" width="190" height="104" rx="12" strokeWidth="3" style={{ ...fill('paper'), ...stroke('ink') }} />
        <polygon points="166,144 150,166 190,144" style={fill('paper')} />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="174" y={58 + i * 28} width="18" height="18" rx="4" strokeWidth="2.5" style={{ ...fill('zone-soc-soft'), ...stroke('ink') }} />
            <rect x="202" y={64 + i * 28} width={[110, 90, 100][i]} height="7" rx="3" style={fill('hairline')} />
            <polyline
              points={`178,${67 + i * 28} 183,${72 + i * 28} 190,${61 + i * 28}`}
              fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              style={{ ...stroke('good-strong'), opacity: i < ticks ? 1 : 0, transition: `opacity 400ms ${i * 500}ms` }}
            />
          </g>
        ))}
      </g>
      <g style={{ opacity: pose >= 3 ? 1 : 0, transition: 'opacity 700ms 800ms' }}>
        <path d="M300 160 c-8 -10 -22 2 -10 12 l10 9 l10 -9 c12 -10 -2 -22 -10 -12 z" className="os-bob" style={fill('zone-health')} />
      </g>
    </>
  )
}

// REPORT — an idea, sent to the request box, voted by friends, becomes a new app.
export function ReportScene({ pose }) {
  return (
    <>
      <Backdrop />
      <Move x={90} y={GY} ms={0}>
        <Person shirt="zone-arts" hair="ink" />
      </Move>
      <g style={{ opacity: pose === 1 ? 1 : 0, transition: 'opacity 400ms' }}>
        <circle cx="90" cy="110" r="13" strokeWidth="3" style={{ ...fill('zone-biz'), ...stroke('ink') }} />
        <rect x="84" y="123" width="12" height="8" strokeWidth="2.5" style={{ ...fill('paper'), ...stroke('ink') }} />
      </g>
      <g style={{ transform: `translate(${pose >= 2 ? 170 : 0}px, ${pose >= 2 ? 24 : 0}px)`, opacity: pose === 2 ? 1 : 0, transition: 'transform 1500ms ease-in, opacity 300ms' }}>
        <polygon points="116,130 150,118 128,142" strokeWidth="2.5" strokeLinejoin="round" style={{ ...fill('paper'), ...stroke('ink') }} />
      </g>
      <g strokeWidth="3" style={stroke('ink')}>
        <rect x="278" y="150" width="76" height="56" rx="6" style={fill('zone-biz')} />
        <rect x="296" y="164" width="40" height="8" rx="3" style={fill('ink')} />
      </g>
      {[0, 1, 2].map((i) => (
        <g key={i} style={{ opacity: pose >= 3 ? 1 : 0, transform: `translateY(${pose >= 3 ? 0 : 10}px)`, transition: `opacity 500ms ${i * 300}ms, transform 500ms ${i * 300}ms` }}>
          <rect x={246 + i * 28} y="110" width="22" height="22" rx="6" strokeWidth="2.5" style={{ ...fill('zone-soc-soft'), ...stroke('ink') }} />
          <rect x={252 + i * 28} y="116" width="10" height="10" style={fill('zone-health')} />
        </g>
      ))}
      <g style={{ opacity: pose >= 4 ? 1 : 0, transform: `scale(${pose >= 4 ? 1 : 0.2})`, transformOrigin: '316px 70px', transition: 'opacity 500ms, transform 600ms cubic-bezier(.3,1.6,.5,1)' }}>
        <rect x="288" y="42" width="56" height="56" rx="14" strokeWidth="3" style={{ ...fill('zone-arts'), ...stroke('ink') }} />
        <polygon points="316,56 321,68 334,69 324,77 328,90 316,83 304,90 308,77 298,69 311,68" style={fill('paper')} />
      </g>
    </>
  )
}
