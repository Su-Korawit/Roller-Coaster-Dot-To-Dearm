import { useState } from 'react'
import { Search, Rocket } from 'lucide-react'
import { AppTile } from '../AppIcon'
import InstallButton from '../InstallButton'
import { CATEGORIES, OS_APPS, findApp, groupByCategory, homeAppIds, searchStoreApps } from '../apps'
import { useOsStore } from '../../stores/useOsStore'
import StoreAppDetail from './StoreAppDetail'
import StoreBanners from './StoreBanners'

// Long sections show 8 apps with a "see all" button.
const COLLAPSED = new Set(['university', 'learn'])

// Store: search, banners, catalogue by category, install with a download bar. Creating/selling apps is the next step (teaser only).
export default function StoreApp({ onOpenApp }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [detailId, setDetailId] = useState(null)
  const installed = useOsStore((s) => s.installed)
  const results = searchStoreApps(query, OS_APPS, category)
  const onHome = homeAppIds(installed)
  const catalogEmpty = !OS_APPS.some((a) => a.installable)
  const grouped = category === 'all' && !query.trim()

  function onBannerAction(action) {
    if (action.type === 'category') setCategory(action.categoryId)
    else if (action.type === 'open') {
      const app = findApp(action.appId)
      if (app) onOpenApp(app)
    }
  }

  const detailApp = detailId ? OS_APPS.find((a) => a.id === detailId) : null
  if (detailApp) {
    return (
      <StoreAppDetail
        app={detailApp}
        installed={onHome.includes(detailApp.id)}
        onOpen={onOpenApp}
        onBack={() => setDetailId(null)}
      />
    )
  }

  const renderApp = (app) => (
    <li key={app.id} className="flex flex-col items-center gap-1.5 text-center">
      <button
        type="button"
        onClick={() => setDetailId(app.id)}
        aria-label={`ดูรายละเอียด ${app.name}`}
        className="flex flex-col items-center gap-1.5 max-w-full rounded-ui active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <AppTile app={app} />
        <span className="thai-font text-xs font-semibold truncate max-w-full">{app.name}</span>
      </button>
      <InstallButton app={app} installed={onHome.includes(app.id)} onOpen={onOpenApp} />
    </li>
  )
  const gridClass = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4'

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

      <StoreBanners onAction={onBannerAction} />

      <div className="flex gap-2 overflow-x-auto os-pages -mx-1 px-1 pb-1" role="tablist" aria-label="หมวดหมู่">
        {[{ id: 'all', label: 'ทั้งหมด' }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={`px-btn px-3 py-1 thai-font text-xs font-bold whitespace-nowrap shrink-0 ${category === c.id ? 'bg-brand-strong text-white' : 'bg-paper'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section aria-label="แอปทั้งหมด" className="flex flex-col gap-6">
        {results.length === 0 ? (
          <p className="thai-font text-sm text-ink-soft text-center py-8">
            {catalogEmpty ? 'ยังไม่มีแอปให้ติดตั้ง เร็วๆ นี้' : `ไม่พบแอปที่ตรงกับ "${query}"`}
          </p>
        ) : grouped ? (
          groupByCategory(results).map((g) => (
            <div key={g.id} className="flex flex-col gap-3">
              <h3 className="thai-font font-bold text-sm">{g.label}</h3>
              <ul className={gridClass}>{(COLLAPSED.has(g.id) ? g.apps.slice(0, 8) : g.apps).map(renderApp)}</ul>
              {COLLAPSED.has(g.id) && g.apps.length > 8 && (
                <button type="button" onClick={() => setCategory(g.id)} className="self-center px-btn px-4 py-1.5 thai-font text-xs font-bold bg-paper">
                  ดู{g.label}ทั้งหมด ({g.apps.length})
                </button>
              )}
            </div>
          ))
        ) : (
          <ul className={gridClass}>{results.map(renderApp)}</ul>
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
