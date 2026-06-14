import { useState } from 'react'
import AnalyticsSection from '../components/admin/AnalyticsSection'
import AssetsSection from '../components/admin/AssetsSection'
import { useAuthStore } from '../stores/useAuthStore'
import { ADMIN_DISPLAY_NAME } from '../constants/admin'

const TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'assets',    label: 'Assets' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('analytics')
  const user = useAuthStore((s) => s.user)

  return (
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
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {tab === 'analytics' && <AnalyticsSection />}
        {tab === 'assets'    && <AssetsSection />}
      </main>
    </div>
  )
}
