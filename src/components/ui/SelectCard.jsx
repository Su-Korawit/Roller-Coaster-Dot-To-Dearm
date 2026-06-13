/**
 * SelectCard — selectable card used by Career and Mastery pages.
 * Shows name + optional detail text. Pink ring when selected.
 * Aria: role="option" + aria-selected for screen readers.
 */
export default function SelectCard({ name, detail, selected, onClick }) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`
        flex w-full items-start overflow-hidden rounded-2xl bg-white text-left
        transition-all hover:shadow-md active:scale-[0.98]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        ${selected ? 'ring-4 ring-pink-400 shadow-md' : 'ring-0 shadow-sm'}
      `}
    >
      <div className="px-4 py-3">
        <p
          className="pixel-font text-sm font-bold text-gray-900 leading-snug"
        >
          {name}
        </p>
        {detail && (
          <p
            className="mt-1 text-xs leading-snug text-gray-500"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            {detail}
          </p>
        )}
      </div>
    </button>
  )
}
