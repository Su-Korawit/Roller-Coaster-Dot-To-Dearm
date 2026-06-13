import { mbtiColor } from '../../constants/mbtiColors'

// Colored MBTI type pill — replaces 15+ inline copies across panels.
export default function MBTIBadge({ mbti }) {
  if (!mbti) return null
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-white pixel-font leading-none"
      style={{ backgroundColor: mbtiColor(mbti) }}
    >
      {mbti}
    </span>
  )
}
