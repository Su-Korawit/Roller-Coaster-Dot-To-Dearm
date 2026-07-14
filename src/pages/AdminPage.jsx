import { useState } from 'react'
import AnalyticsSection from '../components/admin/AnalyticsSection'
import { CharactersGrid, MapsPanel } from '../components/admin/AssetsSection'
import UserManagementSection from '../components/admin/UserManagementSection'
import AssetsManagerSection from '../components/admin/AssetsManagerSection'
import UpdateAssetsSection from '../components/admin/UpdateAssetsSection'
import MusicSection from '../components/admin/MusicSection'
import ShopSection from '../components/admin/ShopSection'
import FinanceSection from '../components/admin/FinanceSection'
import WelcomeSection from '../components/admin/WelcomeSection'
import FarmDataSection from '../components/admin/FarmDataSection'
import IdeaRequestSection from '../components/admin/IdeaRequestSection'
import { ToastProvider } from '../components/admin/Toast'
import { useAuthStore } from '../stores/useAuthStore'
import { ADMIN_DISPLAY_NAME, ADMIN_ROLES, getAdminSections } from '../constants/admin'

const IR_TAB = { id: 'idea-request', label: 'Idea-Request' }

// Every admin tab + its section key. AdminPage shows only the tabs the signed-in
// admin's email is allowed to edit (getAdminSections), so a scoped admin sees just
// their one section. Section keys must match those in src/constants/admin.js.
const ALL_TABS = [
  { id: 'analytics',  label: 'Analytics' },
  { id: 'users',      label: 'Users' },
  { id: 'characters', label: 'Characters' },
  { id: 'maps',       label: 'Maps' },
  { id: 'assets',     label: 'Assets' },
  { id: 'music',      label: 'Music' },
  { id: 'shop',       label: 'Shop' },
  { id: 'finance',    label: 'Finance' },
  { id: 'welcome',    label: 'Welcome' },
  { id: 'farm',       label: '🌱 Farm Data' },
]

export default function AdminPage() {
  const user = useAuthStore((s) => s.user)
  const sections = getAdminSections(user?.email)
  // IR tab is for every ADMIN_ROLES email regardless of section scope (ADR
  // 0013) — an admin with no sections yet must still see it, so gate on
  // membership, not on sections.length.
  const isAdmin = Boolean(ADMIN_ROLES[user?.email?.toLowerCase() ?? ''])
  const tabs = [
    ...ALL_TABS.filter((t) => sections.includes(t.id)),
    ...(isAdmin ? [IR_TAB] : []),
  ]
  const [tab, setTab] = useState(() => tabs[0]?.id ?? null)

  return (
    <ToastProvider>
      <div className="relative min-h-screen bg-brand-soft flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 neo-slab rounded-none border-x-0 border-t-0 px-3 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="pixel-font text-[11px] text-ink">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">{ADMIN_DISPLAY_NAME} · {user?.email}</p>
          </div>
          <a href="/home" className="text-xs text-brand hover:underline flex-shrink-0">← Back to app</a>
        </header>

        {/* Tab switcher — horizontally swipeable on narrow viewports */}
        <div className="border-b border-gray-200 bg-white px-3 sm:px-6 flex-shrink-0">
          <div className="flex gap-1 -mb-px overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
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
        <main
          className={
            tab === 'idea-request'
              ? 'flex-1 min-h-0 flex flex-col'
              : 'max-w-5xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8'
          }
        >
          {tab === 'analytics'  && <AnalyticsSection />}
          {tab === 'users'      && <UserManagementSection />}
          {tab === 'characters' && <CharactersGrid />}
          {tab === 'maps'       && <MapsPanel />}
          {tab === 'assets'     && (
            <div className="space-y-8">
              <UpdateAssetsSection />
              <AssetsManagerSection />
            </div>
          )}
          {tab === 'music'      && <MusicSection />}
          {tab === 'shop'       && <ShopSection />}
          {tab === 'finance'    && <FinanceSection />}
          {tab === 'welcome'    && <WelcomeSection />}
          {tab === 'farm'       && <FarmDataSection />}
          {tab === 'idea-request' && <IdeaRequestSection />}
        </main>
      </div>
    </ToastProvider>
  )
}
