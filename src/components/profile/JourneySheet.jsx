// Bottom-sheet panel for Add / Edit journey items. Extracted from ProfilePanel.
export default function JourneySheet({ title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-60 flex flex-col justify-end">
      {/* Backdrop — covers entire panel including nav area */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Sheet */}
      <div className="relative bg-white rounded-t-4xl px-6 pt-4 pb-10 shadow-2xl max-h-[85vh] flex flex-col md:max-w-lg md:mx-auto md:w-full">
        {/* Drag handle */}
        <div className="flex justify-center mb-3 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <h3 className="text-center font-bold text-gray-800 text-base mb-5 shrink-0">{title}</h3>
        <div className="overflow-y-auto flex-1 space-y-3 pb-4">
          {children}
        </div>
      </div>
    </div>
  )
}
