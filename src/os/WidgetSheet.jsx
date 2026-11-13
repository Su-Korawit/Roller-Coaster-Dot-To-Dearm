import OsSheet from './OsSheet'
import { useOsStore } from '../stores/useOsStore'
import { MAX_WIDGETS, SIZE_LABEL, WIDGET_FAMILIES, cleanWidgetIds, widgetId } from './widgetsLogic'
import { findApp } from './apps'

// Tiny outline of a widget's footprint on the Home grid (small 2x1, medium 4x1, large 4x2 cells).
const SHAPE = { small: 'w-5 h-3', medium: 'w-9 h-3', large: 'w-9 h-6' }

// Pick which widgets sit on the Home screen: one row per app, a chip per size (at most MAX_WIDGETS in all).
export default function WidgetSheet({ onClose }) {
  const widgets = cleanWidgetIds(useOsStore((s) => s.widgets))
  const installed = useOsStore((s) => s.installed)
  const toggle = useOsStore((s) => s.toggleWidget)
  const full = widgets.length >= MAX_WIDGETS
  return (
    <OsSheet title="วิดเจ็ตบนหน้า Home" onClose={onClose}>
      <p className="thai-font text-xs text-ink-soft mb-3">เลือกขนาดของแต่ละแอป ใส่ได้ {widgets.length}/{MAX_WIDGETS} อัน แตะวิดเจ็ตบน Home เพื่อเปิดแอป</p>
      <ul className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        {WIDGET_FAMILIES.map((f) => {
          const app = findApp(f.appId)
          const missing = !app || !(app.builtIn || installed.includes(app.id))
          return (
            <li key={f.id} className="flex flex-col gap-1.5">
              <div>
                <p className="thai-font text-sm font-bold">{f.name}</p>
                <p className="thai-font text-xs text-ink-soft">{missing ? `ต้องติดตั้งแอป ${app?.name ?? ''} ก่อน` : f.hint}</p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`ขนาดวิดเจ็ต ${f.name}`}>
                {f.sizes.map((size) => {
                  const id = widgetId(f.id, size)
                  const on = widgets.includes(id)
                  const blocked = !on && (full || missing)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      disabled={blocked}
                      aria-pressed={on}
                      aria-label={`${on ? 'เอาออก' : 'เพิ่ม'} ${f.name} ขนาด${SIZE_LABEL[size]}`}
                      className={`px-btn px-3 py-1.5 thai-font text-xs font-bold flex items-center gap-2 disabled:opacity-40 ${on ? 'bg-brand-strong text-white' : 'bg-paper'}`}
                    >
                      <span className={`${SHAPE[size]} rounded-sm border-2 border-current`} aria-hidden="true" />
                      {SIZE_LABEL[size]}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </OsSheet>
  )
}
