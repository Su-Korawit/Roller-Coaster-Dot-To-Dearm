import SearchBar from '../ui/SearchBar'

const SORTS = [
  { id: 'seats', label: 'ที่นั่งมากสุด' },
  { id: 'name', label: 'ชื่อ ก–ฮ' },
  { id: 'programs', label: 'หลักสูตรมากสุด' },
]

// Search + university-type chips + sort. Controlled: the popup owns the values.
export default function FilterBar({ query, onQuery, types, selected, onToggleType, onClearTypes, sort, onSort }) {
  return (
    <div className="px-3 py-2.5 flex flex-wrap items-center gap-1.5 border-b-2 border-line bg-mist shrink-0">
      <div className="basis-full">
        <SearchBar value={query} onChange={(e) => onQuery(e.target.value)} placeholder="ค้นหามหาลัยหรือหลักสูตร" label="ค้นหามหาลัยหรือหลักสูตร" />
      </div>
      <button
        type="button"
        aria-pressed={selected.length === 0}
        onClick={onClearTypes}
        className={`thai-font text-xs font-bold px-2.5 py-1 border-2 border-line rounded-full ${selected.length === 0 ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
      >
        ทั้งหมด
      </button>
      {types.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={selected.includes(t)}
          onClick={() => onToggleType(t)}
          className={`thai-font text-xs font-bold px-2.5 py-1 border-2 border-line rounded-full ${selected.includes(t) ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
        >
          {t}
        </button>
      ))}
      <label className="ml-auto thai-font text-xs text-ink-soft flex items-center gap-1">
        เรียง
        <select value={sort} onChange={(e) => onSort(e.target.value)} className="px-input thai-font text-xs py-1 px-1.5">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
    </div>
  )
}
