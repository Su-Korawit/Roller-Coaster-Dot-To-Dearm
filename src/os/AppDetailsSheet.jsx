import OsSheet from './OsSheet'
import { AppTile } from './AppIcon'

// Long-press on an icon: what the app is, open it, or (for installed apps) remove it.
export default function AppDetailsSheet({ app, onOpen, onUninstall, onClose }) {
  return (
    <OsSheet title="รายละเอียดแอป" onClose={onClose}>
      <div className="flex items-center gap-4">
        <AppTile app={app} size={72} />
        <div className="min-w-0">
          <p className="thai-font font-bold text-lg truncate">{app.name}</p>
          <p className="thai-font text-sm text-ink-soft">{app.tagline}</p>
        </div>
      </div>
      {app.description && <p className="thai-font text-sm mt-4 leading-relaxed">{app.description}</p>}
      <div className="flex gap-3 mt-5">
        <button
          type="button"
          onClick={() => { onOpen(app); onClose() }}
          className="px-btn flex-1 py-2.5 thai-font text-sm font-bold bg-brand-strong text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          เปิด
        </button>
        {!app.builtIn && (
          <button
            type="button"
            onClick={() => { onUninstall(app); onClose() }}
            className="px-btn flex-1 py-2.5 thai-font text-sm font-bold bg-paper text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            ถอนการติดตั้ง
          </button>
        )}
      </div>
    </OsSheet>
  )
}
