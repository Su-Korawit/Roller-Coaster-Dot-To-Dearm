export function CoinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="#a78bda" stroke="#7c3aed" strokeWidth="1.5"/>
      <text
        x="8"
        y="11.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="white"
        fontFamily="system-ui, sans-serif"
      >
        ⊙
      </text>
    </svg>
  )
}
