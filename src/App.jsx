import { useEffect } from 'react'
import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { getAdminSections } from './constants/admin'
import OnboardingModal from './components/onboarding/OnboardingModal'
import ConsentGate from './components/ConsentGate'
import LoadingScene from './components/ui/LoadingScene'
import RequireCreator from './components/studio/RequireCreator'
import FxLayer from './components/hud/FxLayer'
import { installUiSounds } from './lib/sfx'
import { useConsentStore } from './stores/useConsentStore'
import { currentSite } from './lib/site'
import { SITES } from './constants/sites'

// Route-level code splitting: each page loads on first navigation, keeping the
// entry chunk free of Phaser (HomePage→GameCanvas), React Flow (RoadmapPage),
// Leaflet, and the admin dashboard.
const HomePage = lazy(() => import('./pages/HomePage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const RoadmapPublicView = lazy(() => import('./pages/RoadmapPublicView'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const OsShell = lazy(() => import('./os/OsShell'))
const NewsPostPage = lazy(() => import('./pages/NewsPostPage'))
const StudioListPage = lazy(() => import('./pages/studio/StudioListPage'))
// TipTap lives only in the editor chunk.
const StudioEditorPage = lazy(() => import('./pages/studio/StudioEditorPage'))
const StudioPreviewPage = lazy(() => import('./pages/studio/StudioPreviewPage'))
const MusicCallback = lazy(() => import('./pages/MusicCallback'))
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/legal/TermsPage'))
// Dev-only style guide; the import is tree-shaken from production builds.
const DevUiKit = import.meta.env.DEV ? lazy(() => import('./pages/DevUiKit')) : null

// Feature-site pages — separate lazy chunks so hub/roadmap/tcas/news/school
// never pull the Phaser bundle.
const HubHome = lazy(() => import('./pages/hub/HubHome'))
const ArticlePage = lazy(() => import('./pages/hub/ArticlePage'))
const CategoryPage = lazy(() => import('./pages/hub/CategoryPage'))
const SearchPage = lazy(() => import('./pages/hub/SearchPage'))
const RoadmapLanding = lazy(() => import('./pages/landing/RoadmapLanding'))
const SchoolLanding = lazy(() => import('./pages/landing/SchoolLanding'))
const NewsHomePage = lazy(() => import('./pages/landing/NewsHomePage'))
const TcasExplorerPage = lazy(() => import('./pages/landing/TcasExplorerPage'))
const SchoolAppPage = lazy(() => import('./pages/SchoolAppPage'))
const BagPage = lazy(() => import('./pages/BagPage'))
const OpenHousePage = lazy(() => import('./pages/OpenHousePage'))
const FeatureLayout = lazy(() => import('./components/FeatureLayout'))

function LoadingScreen() {
  return <LoadingScene />
}

function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const consent = useConsentStore((s) => s.status)

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  // PDPA: nothing past this point until the current Privacy Policy/Terms are accepted.
  if (consent === 'needed') return <ConsentGate />
  return <Outlet />
}

function MobileLayout() {
  const user = useAuthStore((s) => s.user)
  return (
    // Full-viewport flex column — fills the screen on every device (phone → desktop).
    // Pages own their own max-width/centering; the game can now go truly fullscreen.
    <div className="h-dvh w-full bg-mist relative overflow-x-hidden flex flex-col">
      {/* flex-1 so h-full pages get a definite height; overflow-hidden clips panels */}
      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
      {user && <OnboardingModal />}
      <FxLayer />
    </div>
  )
}

function RequireAdmin() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  if (!user || getAdminSections(user.email).length === 0) return <Navigate to="/" replace />
  return <Outlet />
}

function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])
  return null
}

// Legacy hub news URLs now live under /blog (the migration keeps each old id as the slug).
function HubNewsRedirect() {
  const { id } = useParams()
  return <Navigate to={`/blog/${id}`} replace />
}

function AppSiteRoutes() {
  return (
    <Routes>
      {/* Admin — full-width desktop, outside mobile frame */}
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Studio — creators write articles for the content site (hub) */}
      <Route element={<RequireCreator />}>
        <Route path="/studio" element={<StudioListPage />} />
        <Route path="/studio/preview/:draftId" element={<StudioPreviewPage />} />
        <Route path="/studio/:draftId" element={<StudioEditorPage />} />
      </Route>

      {/* Public — landing + auth, outside the mobile frame so the page can scroll */}
      {/* "/" is the OS shell (login → passcode → Home). The old landing lives at /welcome. */}
      <Route path="/" element={<OsShell />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/news/:id" element={<NewsPostPage />} />
      <Route path="/auth" element={<AuthPage />} />
      {/* Open House campus: guest-usable, deliberately outside RequireAuth (ADR-0026). */}
      <Route
        path="/openhouse"
        element={(
          <FeatureLayout>
            <OpenHousePage />
          </FeatureLayout>
        )}
      />
      {DevUiKit && <Route path="/dev/ui" element={<DevUiKit />} />}

      <Route element={<MobileLayout />}>
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/music/callback" element={<MusicCallback />} />
        </Route>
      </Route>
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function HubSiteRoutes() {
  return (
    <Routes>
      {/* ilovetcas.com opens the OS (ADR-0029); the article list moved to /articles */}
      <Route path="/" element={<OsShell />} />
      <Route path="/articles" element={<HubHome />} />
      <Route path="/blog/:slug" element={<ArticlePage />} />
      <Route path="/category/:cat" element={<CategoryPage />} />
      <Route path="/search" element={<SearchPage />} />
      {/* Open House campus: guest-usable, deliberately outside RequireAuth (ADR-0026). */}
      <Route
        path="/openhouse"
        element={(
          <FeatureLayout>
            <OpenHousePage />
          </FeatureLayout>
        )}
      />
      <Route path="/home" element={<ExternalRedirect to="https://app.ilovetcas.com/home" />} />
      <Route path="/roadmap" element={<ExternalRedirect to="https://app.ilovetcas.com/roadmap" />} />
      <Route path="/auth" element={<ExternalRedirect to="https://app.ilovetcas.com/auth" />} />
      <Route path="/admin" element={<ExternalRedirect to="https://app.ilovetcas.com/admin" />} />
      <Route path="/news/:id" element={<HubNewsRedirect />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RoadmapSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoadmapLanding />} />
      <Route
        path="/editor"
        element={(
          <FeatureLayout>
            <RoadmapPage backPath="/" />
          </FeatureLayout>
        )}
      />
      <Route
        path="/view/:shareId"
        element={(
          <FeatureLayout>
            <RoadmapPublicView />
          </FeatureLayout>
        )}
      />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function TcasSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TcasExplorerPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function NewsSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<NewsHomePage />} />
      <Route path="/:id" element={<NewsPostPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function SchoolSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SchoolLanding />} />
      <Route
        path="/app"
        element={(
          <FeatureLayout>
            <SchoolAppPage />
          </FeatureLayout>
        )}
      />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// File Bag is auth-gated (ADR-0016 exception to ADR-0012 guest mode).
function BagSiteRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route
          path="/"
          element={(
            <FeatureLayout>
              <BagPage />
            </FeatureLayout>
          )}
        />
      </Route>
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function SiteRoutes() {
  switch (currentSite) {
    case 'hub':
      return <HubSiteRoutes />
    case 'roadmap':
      return <RoadmapSiteRoutes />
    case 'tcas':
      return <TcasSiteRoutes />
    case 'news':
      return <NewsSiteRoutes />
    case 'school':
      return <SchoolSiteRoutes />
    case 'bag':
      return <BagSiteRoutes />
  }
  return <AppSiteRoutes />
}

function App() {
  // One delegated listener gives every button/link/tab the UI click blip.
  useEffect(() => installUiSounds(), [])

  // SPA-side counterpart of the Phase 4 prerender: after hydration replaces
  // the static landing HTML, keep the head tags matching the current site.
  useEffect(() => {
    const site = SITES[currentSite]
    // The hub's head is rendered per page by the server (and pages set their own title);
    // overwriting the description here would give every article the home description.
    if (!site || currentSite === 'hub') return
    document.title = site.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', site.description)
  }, [])

  return (
    <Suspense fallback={<LoadingScreen />}>
      <SiteRoutes />
    </Suspense>
  )
}

export default App
