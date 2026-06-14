import { useState } from 'react'
import AnalyticsSection from '../components/admin/AnalyticsSection'
import AssetsSection from '../components/admin/AssetsSection'
import { ToastProvider } from '../components/admin/Toast'
import { useAuthStore } from '../stores/useAuthStore'
import { ADMIN_DISPLAY_NAME } from '../constants/admin'

const TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'assets',    label: 'Assets' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('analytics')
  const [assetsStatus, setAssetsStatus] = useState(null) // { cloudCount, total }
  const user = useAuthStore((s) => s.user)

  const missing = assetsStatus ? assetsStatus.total - assetsStatus.cloudCount : 0

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F4F7FC]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="pixel-font text-[11px] text-ink">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">{ADMIN_DISPLAY_NAME} · {user?.email}</p>
          </div>
          <a href="/home" className="text-xs text-brand hover:underline">← Back to app</a>
        </header>

        {/* Tab switcher */}
        <div className="border-b border-gray-200 bg-white px-6">
          <div className="flex gap-1 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
                {t.id === 'assets' && assetsStatus && missing > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    {missing} missing
                  </span>
                )}
                {t.id === 'assets' && assetsStatus && missing === 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    ✓ all cloud
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          {tab === 'analytics' && <AnalyticsSection />}
          {tab === 'assets'    && <AssetsSection onStatus={setAssetsStatus} />}
        </main>
      </div>
    </ToastProvider>
  )
}
