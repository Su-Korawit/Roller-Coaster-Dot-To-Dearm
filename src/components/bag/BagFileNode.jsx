import { memo } from 'react'
import { FileText, Image, Film, Package } from 'lucide-react'

const KIND_ICON = {
  image: Image,
  video: Film,
  file: FileText,
  export: Package,
}

function BagFileNode({ data, selected }) {
  const Icon = KIND_ICON[data.kind] ?? FileText
  return (
    <div
      className={`relative w-28 h-28 rounded-xl border-2 bg-surface p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all ${
        selected ? 'border-ink shadow-hard-sm' : 'border-ink/30'
      }`}
    >
      <Icon size={28} className="text-brand" strokeWidth={2} />
      <span className="pixel-font text-[7px] text-ink text-center line-clamp-2 w-full px-0.5">
        {data.name || 'file'}
      </span>
    </div>
  )
}

export default memo(BagFileNode)
