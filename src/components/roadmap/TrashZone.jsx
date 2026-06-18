import { forwardRef } from 'react'
import { Trash2 } from 'lucide-react'

const TrashZone = forwardRef(function TrashZone({ visible, over }, ref) {
  return (
    <div
      ref={ref}
      aria-label="Trash zone — drop block here to delete"
      className={[
        'absolute bottom-6 left-1/2 -translate-x-1/2 z-20',
        'flex flex-col items-center justify-center gap-1',
        'w-16 h-16 rounded-2xl border-2 transition-all duration-150',
        'pointer-events-none select-none',
        visible
          ? over
            ? 'opacity-100 bg-red-100 border-red-500 scale-110'
            : 'opacity-80 bg-white border-red-300'
          : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <Trash2 size={22} className={over ? 'text-red-600' : 'text-red-400'} strokeWidth={2} />
      <span className="pixel-font text-[7px] text-red-500">Delete</span>
    </div>
  )
})

export default TrashZone
