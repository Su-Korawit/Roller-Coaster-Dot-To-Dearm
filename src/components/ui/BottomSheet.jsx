import Popup from './Popup'

// Backward-compatible alias — existing callers keep working while new code
// uses <Popup variant="sheet"> directly.
export default function BottomSheet({ onClose, maxHeight = 'max-h-[85vh]', backdrop = true, children }) {
  return (
    <Popup variant="sheet" maxHeight={maxHeight} backdrop={backdrop} onClose={onClose}>
      {children}
    </Popup>
  )
}
