import { useState } from 'react'
import { ArrowLeft, ChevronRight, Search } from 'lucide-react'
import { tcasLogoUrl } from '../../hooks/useMytcas'

// Small pieces shared by the Goal app's picker, Starter fallback and advisor.

export function BackBar({ onBack, title, sub }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onBack} aria-label="ย้อนกลับ" className="w-9 h-9 shrink-0 flex items-center justify-center rounded-ui hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <ArrowLeft size={18} />
      </button>
      <div className="min-w-0">
        <h3 className="thai-font font-bold leading-tight truncate">{title}</h3>
        {sub && <p className="thai-font text-xs text-ink-soft truncate">{sub}</p>}
      </div>
    </div>
  )
}

export function SearchBox({ value, onChange, label }) {
  return (
    <label className="px-input flex items-center gap-2 px-3 h-11">
      <Search size={18} className="text-ink-soft shrink-0" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="thai-font text-sm flex-1 bg-transparent outline-none text-ink placeholder:text-ink-soft"
      />
    </label>
  )
}

export function PickRow({ title, sub, leading, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 px-card px-3 py-2.5 text-left bg-paper active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block thai-font text-sm font-semibold truncate">{title}</span>
        {sub && <span className="block thai-font text-xs text-ink-soft truncate">{sub}</span>}
      </span>
      <ChevronRight size={16} className="text-ink-soft shrink-0" aria-hidden="true" />
    </button>
  )
}

// University crest from MyTCAS; a letter badge when the picture is missing.
export function UniLogo({ id, name, size = 40 }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="shrink-0 rounded-ui bg-paper border-2 border-hairline overflow-hidden flex items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      {id && !broken ? (
        <img src={tcasLogoUrl(id)} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="font-display font-bold text-brand-strong text-sm">{String(name ?? '?').replace(/^(มหาวิทยาลัย|สถาบัน)/, '').slice(0, 1)}</span>
      )}
    </span>
  )
}

export const Loading = ({ text = 'กำลังโหลด...' }) => <p className="thai-font text-sm text-ink-soft text-center py-8">{text}</p>
export const Failed = ({ onRetry }) => (
  <div className="text-center py-8 flex flex-col items-center gap-2">
    <p role="alert" className="thai-font text-sm text-zone-health-deep">โหลดข้อมูลไม่สำเร็จ</p>
    {onRetry && <button type="button" onClick={onRetry} className="px-btn px-3 py-1 thai-font text-xs font-bold bg-paper">ลองใหม่</button>}
  </div>
)
