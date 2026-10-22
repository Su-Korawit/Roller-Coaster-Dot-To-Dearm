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
            ? 'opacity-100 bg-danger/20 border-danger scale-110'
            : 'opacity-80 bg-paper border-danger/50'
          : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <Trash2 size={22} className={over ? 'text-danger' : 'text-danger/70'} strokeWidth={2} />
      <span className="pixel-font text-xs text-danger">Delete</span>
    </div>
  )
})

export default TrashZone
