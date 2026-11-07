const f = (token) => ({ fill: `var(--color-${token})` })

// A simple flat character. Origin (0,0) = the feet, so scenes position it with translate().
// walking: legs swing; reach: front arm lifts; facing: 1 = right, -1 = left.
export default function Person({ shirt = 'zone-sci', hair = 'ink', walking = false, reach = false, facing = 1, scale = 1.5 }) {
  const ink = { stroke: 'var(--color-ink)', strokeWidth: 1.5 }
  return (
    <g style={{ transform: `scale(${facing * scale}, ${scale})` }}>
      <g className={walking ? 'os-leg os-leg-a' : undefined} style={{ transformOrigin: '0px -16px' }}>
        <rect x="-5" y="-16" width="4.5" height="16" rx="2" style={f('ink')} />
      </g>
      <g className={walking ? 'os-leg os-leg-b' : undefined} style={{ transformOrigin: '0px -16px' }}>
        <rect x="0.5" y="-16" width="4.5" height="16" rx="2" style={f('ink')} />
      </g>
      <rect x="-8" y="-35" width="16" height="21" rx="5" style={{ ...f(shirt), ...ink }} />
      <g style={{ transformOrigin: '0px -31px', transform: `rotate(${reach ? -100 : 0}deg)`, transition: 'transform 500ms ease-out' }}>
        <rect x="5" y="-31" width="4" height="15" rx="2" style={{ ...f('zone-biz-soft'), ...ink }} />
      </g>
      <circle cx="0" cy="-44" r="9" style={{ ...f('zone-biz-soft'), ...ink }} />
      <path d="M-9 -45 a9 9 0 0 1 18 0 q-9 -4 -18 0 z" style={f(hair)} />
      <circle cx="3" cy="-43" r="1.3" style={f('ink')} />
    </g>
  )
}
