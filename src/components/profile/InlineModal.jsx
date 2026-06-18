// Centered modal — absolute positioning avoids backdrop-blur stacking-context
// issues with fixed. Extracted from ProfilePanel.
export default function InlineModal({ title, children, onClose }) {
  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl flex flex-col max-h-[80vh]">
        <p className="pixel-font text-[10px] text-gray-700 mb-3 shrink-0">{title}</p>
        <div className="overflow-y-auto flex-1 space-y-3 pr-1 pb-1">
          {children}
        </div>
        <button
          onClick={onClose}
          className="w-full text-gray-400 text-sm py-2 hover:text-gray-600 shrink-0 mt-2"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
