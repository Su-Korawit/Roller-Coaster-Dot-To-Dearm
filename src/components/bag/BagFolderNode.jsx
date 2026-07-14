import { memo } from 'react'
import { Folder } from 'lucide-react'

function BagFolderNode({ data, selected }) {
  return (
    <div
      className={`relative w-28 h-28 rounded-xl border-2 bg-brand-soft p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all ${
        selected ? 'border-ink shadow-hard-sm' : 'border-ink/30'
      }`}
    >
      <Folder size={32} className="text-brand" strokeWidth={2} fill="currentColor" fillOpacity={0.15} />
      <span className="pixel-font text-[7px] text-ink text-center line-clamp-2 w-full px-0.5">
        {data.name || 'Folder'}
      </span>
    </div>
  )
}

export default memo(BagFolderNode)
