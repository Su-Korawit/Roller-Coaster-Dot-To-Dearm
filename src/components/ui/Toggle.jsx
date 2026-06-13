// Accessible on/off toggle — extracted from SettingsSheet.
// checked: boolean; onChange: (bool) => void; label: string (screen-reader)
export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
        ${checked ? 'bg-brand' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}
