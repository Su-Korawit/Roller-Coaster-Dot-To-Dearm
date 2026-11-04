import { Search } from 'lucide-react'

/**
 * SearchBar — shared search input used across the wizard select pages.
 * Renders a labelled text input + search icon.
 * Uses Noto Sans Thai (body font) for legible Thai placeholder/input text.
 */
export default function SearchBar({ value, onChange, placeholder = 'Search...', label = 'ค้นหา' }) {
  return (
    <div className="flex items-center px-input px-4 py-3 focus-within:ring-2 focus-within:ring-lime">
      <label className="sr-only">{label}</label>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
        className="w-full bg-transparent thai-font text-sm text-ink placeholder:text-ink-soft/50 outline-none"
      />
      <Search size={18} strokeWidth={2.5} className="text-ink-soft shrink-0" aria-hidden="true" />
    </div>
  )
}
