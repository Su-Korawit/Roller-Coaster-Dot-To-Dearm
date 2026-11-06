import { useState } from 'react'
import { Search, Sparkles, Rocket } from 'lucide-react'
import { AppTile } from '../AppIcon'
import { OS_APPS, homeAppIds, searchStoreApps } from '../apps'
import { useOsStore } from '../../stores/useOsStore'

// Store: search, banner, installable apps. Creating/selling apps is the next step (teaser only).
export default function StoreApp({ onOpenApp }) {
  const [query, setQuery] = useState('')
  const installed = useOsStore((s) => s.installed)
  const installApp = useOsStore((s) => s.installApp)
  const results = searchStoreApps(query)
  const onHome = homeAppIds(installed)
  const catalogEmpty = !OS_APPS.some((a) => a.installable)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <label className="px-input flex items-center gap-2 px-3 h-11">
        <Search size={18} className="text-ink-soft shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาแอป"
          aria-label="ค้นหาแอป"
          className="thai-font text-sm flex-1 bg-transparent outline-none text-ink placeholder:text-ink-soft"
        />
      </label>

      <section
        className="px-card p-5 flex items-center gap-4 text-white"
        style={{ background: 'linear-gradient(135deg, var(--color-zone-soc), var(--color-brand-strong))' }}
        aria-label="แบนเนอร์"
      >
        <Sparkles size={36} aria-hidden="true" />
        <div>
          <h3 className="font-display font-bold text-lg">ยินดีต้อนรับสู่ Store</h3>
          <p className="thai-font text-sm opacity-90">แอปและเว็บไซต์ช่วยเตรียมตัวสอบ TCAS ติดตั้งแล้วจะอยู่บนหน้าหลัก</p>
        </div>
      </section>

      <section aria-label="แอปทั้งหมด">
        {results.length > 0 ? (
          <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {results.map((app) => {
              const has = onHome.includes(app.id)
              return (
                <li key={app.id} className="flex flex-col items-center gap-1.5 text-center">
                  <AppTile app={app} />
                  <span className="thai-font text-xs font-semibold truncate max-w-full">{app.name}</span>
                  <button
                    type="button"
                    onClick={() => (has ? onOpenApp(app) : installApp(app.id))}
                    className="px-btn px-3 py-1 thai-font text-xs font-bold bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {has ? 'เปิด' : 'ติดตั้ง'}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="thai-font text-sm text-ink-soft text-center py-8">
            {catalogEmpty ? 'ยังไม่มีแอปให้ติดตั้ง เร็วๆ นี้' : `ไม่พบแอปที่ตรงกับ "${query}"`}
          </p>
        )}
      </section>

      <section className="px-card p-4 flex items-center gap-3 bg-brand-soft" aria-label="สร้างแอป">
        <Rocket size={28} className="text-brand-strong shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h3 className="thai-font font-bold text-sm">ทุกคนสร้างแอปและขายได้</h3>
          <p className="thai-font text-xs text-ink-soft">สร้างแอปของคุณเองเพื่อเป็นรายได้เสริม — เร็วๆ นี้</p>
        </div>
        <button type="button" disabled className="px-btn px-3 py-1.5 thai-font text-xs font-bold bg-paper opacity-50">
          เร็วๆ นี้
        </button>
      </section>
    </div>
  )
}
