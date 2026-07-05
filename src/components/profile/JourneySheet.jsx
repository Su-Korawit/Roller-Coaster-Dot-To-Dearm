import Popup from '../ui/Popup'

// Bottom-sheet panel for Add / Edit journey items. Extracted from ProfilePanel.
export default function JourneySheet({ title, onClose, children }) {
  return (
    <Popup variant="sheet" size="md" maxHeight="max-h-[85vh]" onClose={onClose}>
      <div className="px-6 pt-4 pb-10 flex flex-col h-full">
        <h3 className="text-center font-bold text-gray-800 text-base mb-5 shrink-0">{title}</h3>
        <div className="overflow-y-auto flex-1 space-y-3 pb-4">
          {children}
        </div>
      </div>
    </Popup>
  )
}
