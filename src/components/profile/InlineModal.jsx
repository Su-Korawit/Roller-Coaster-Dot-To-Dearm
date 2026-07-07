import Popup from '../ui/Popup'

// Centered modal — absolute positioning avoids backdrop-blur stacking-context
// issues with fixed. Extracted from ProfilePanel.
export default function InlineModal({ title, children, onClose }) {
  return (
    <Popup variant="center" size="sm" maxHeight="max-h-[80vh]" onClose={onClose}>
      <div className="p-5 flex flex-col">
        <p className="pixel-font text-[10px] text-ink mb-3 shrink-0">{title}</p>
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 pb-1">
          {children}
        </div>
        <button
          onClick={onClose}
          className="w-full text-ink-soft text-sm py-2 hover:text-ink shrink-0 mt-2"
        >
          Cancel
        </button>
      </div>
    </Popup>
  )
}
