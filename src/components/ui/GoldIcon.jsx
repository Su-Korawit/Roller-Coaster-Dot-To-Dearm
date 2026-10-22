export function GoldIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="8" y1="14" x2="8" y2="7" stroke="var(--color-warn-strong)" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="8" cy="5.5" rx="2.5" ry="2" fill="var(--color-warn)"/>
      <ellipse cx="5.2" cy="7.5" rx="1.8" ry="1.2" fill="var(--color-warn)" transform="rotate(-30 5.2 7.5)"/>
      <ellipse cx="10.8" cy="7.5" rx="1.8" ry="1.2" fill="var(--color-warn)" transform="rotate(30 10.8 7.5)"/>
    </svg>
  )
}
