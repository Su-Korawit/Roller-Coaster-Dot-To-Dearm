import { Check, Plus } from 'lucide-react'
import OsSheet from './OsSheet'
import { useOsStore } from '../stores/useOsStore'
import { MAX_WIDGETS, WIDGET_DEFS, cleanWidgetIds } from './widgetsLogic'
import { findApp } from './apps'

// Pick which widgets sit on the Home screen (at most MAX_WIDGETS).
export default function WidgetSheet({ onClose }) {
  const widgets = cleanWidgetIds(useOsStore((s) => s.widgets))
  const installed = useOsStore((s) => s.installed)
  const toggle = useOsStore((s) => s.toggleWidget)
  const full = widgets.length >= MAX_WIDGETS
  return (
    <OsSheet title="วิดเจ็ตบนหน้า Home" onClose={onClose}>
      <p className="thai-font text-xs text-ink-soft mb-3">เลือกได้สูงสุด {MAX_WIDGETS} อัน แตะวิดเจ็ตบน Home เพื่อเปิดแอป</p>
      <ul className="flex flex-col gap-2">
        {WIDGET_DEFS.map((d) => {
          const on = widgets.includes(d.id)
          const app = findApp(d.appId)
          const missing = !app || !(app.builtIn || installed.includes(app.id))
          const blocked = !on && (full || missing)
          return (
            <li key={d.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="thai-font text-sm font-bold">{d.name} <span className="font-normal text-xs text-ink-soft">· {d.size === 'small' ? 'เล็ก' : 'กลาง'}</span></p>
                <p className="thai-font text-xs text-ink-soft">{missing ? `ต้องติดตั้งแอป ${app?.name ?? ''} ก่อน` : d.hint}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(d.id)}
                disabled={blocked}
                aria-pressed={on}
                aria-label={`${on ? 'เอาออก' : 'เพิ่ม'} ${d.name}`}
                className={`px-btn px-3 py-1.5 thai-font text-xs font-bold flex items-center gap-1 disabled:opacity-40 ${on ? 'bg-brand-strong text-white' : 'bg-paper'}`}
              >
                {on ? <><Check size={14} aria-hidden="true" /> เพิ่มแล้ว</> : <><Plus size={14} aria-hidden="true" /> เพิ่ม</>}
              </button>
            </li>
          )
        })}
      </ul>
    </OsSheet>
  )
}
