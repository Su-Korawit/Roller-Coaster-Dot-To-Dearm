import DragHandle from './DragHandle'

// Shared bottom-sheet shell: backdrop + rounded-t-3xl container + drag handle.
// onClose: called on backdrop tap
// maxHeight: Tailwind class e.g. "max-h-[80vh]" (default max-h-[85vh])
// backdrop: show dimmed backdrop (default true)
export default function BottomSheet({ onClose, maxHeight = 'max-h-[85vh]', backdrop = true, children }) {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-end"
      style={{ zIndex: 60 }}
    >
      {backdrop && (
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`relative bg-white rounded-t-3xl flex flex-col overflow-hidden ${maxHeight}`}
        onClick={(e) => e.stopPropagation()}
      >
        <DragHandle />
        {children}
      </div>
    </div>
  )
}
