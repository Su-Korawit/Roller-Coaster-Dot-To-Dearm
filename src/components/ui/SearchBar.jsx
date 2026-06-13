/**
 * SearchBar — shared search input used across the wizard select pages.
 * Renders a labelled text input + search icon.
 * Uses Noto Sans Thai (body font) for legible Thai placeholder/input text.
 */
export default function SearchBar({ value, onChange, placeholder = 'Search...', label = 'ค้นหา' }) {
  return (
    <div className="flex items-center rounded-2xl bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-brand shadow-sm">
      <label className="sr-only">{label}</label>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
        className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
        style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
      />
      <span className="text-lg text-gray-400 shrink-0" aria-hidden="true">⌕</span>
    </div>
  )
}
