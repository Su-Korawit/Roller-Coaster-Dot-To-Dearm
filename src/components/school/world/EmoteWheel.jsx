import { EMOTES } from '../../../constants/emotes'

// Eight preset emotes — the only way to "talk" in a School Server room.
export default function EmoteWheel({ onPick, onClose }) {
  return (
    <div
      role="dialog"
      aria-label="เลือกอีโมจิ"
      className="absolute left-4 bottom-40 z-30 px-slab p-2 grid grid-cols-4 gap-1.5 pointer-events-auto"
    >
      {EMOTES.map((e) => (
        <button
          key={e.id}
          onClick={() => { onPick(e.id); onClose() }}
          aria-label={e.label}
          title={e.label}
          className="px-btn w-11 h-11 text-2xl flex items-center justify-center bg-paper rounded-lg"
        >
          <span aria-hidden="true">{e.glyph}</span>
        </button>
      ))}
    </div>
  )
}
