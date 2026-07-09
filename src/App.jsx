import { useEffect } from 'react'
import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { getAdminSections } from './constants/admin'
import OnboardingModal from './components/onboarding/OnboardingModal'
import { currentSite } from './lib/site'

// Route-level code splitting: each page loads on first navigation, keeping the
// entry chunk free of Phaser (HomePage→GameCanvas), React Flow (RoadmapPage),
// Leaflet, and the admin dashboard.
const HomePage = lazy(() => import('./pages/HomePage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const NewsPostPage = lazy(() => import('./pages/NewsPostPage'))
const MusicCallback = lazy(() => import('./pages/MusicCallback'))
const MiniPlayer = lazy(() => import('./components/music/MiniPlayer'))

// Feature-site pages — separate lazy chunks so hub/roadmap/tcas/news/school
// never pull the Phaser bundle.
const HubPage = lazy(() => import('./pages/HubPage'))
const RoadmapLanding = lazy(() => import('./pages/landing/RoadmapLanding'))
const SchoolLanding = lazy(() => import('./pages/landing/SchoolLanding'))
const NewsHomePage = lazy(() => import('./pages/landing/NewsHomePage'))
const TcasExplorerPage = lazy(() => import('./pages/landing/TcasExplorerPage'))
const SchoolAppPage = lazy(() => import('./pages/SchoolAppPage'))

function LoadingScreen() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
    >
      <span className="text-5xl mb-5" aria-hidden="true">🎢</span>
      <span className="pixel-font text-[10px] text-purple-300 mb-4">Loading...</span>
      <div className="flex gap-1" role="progressbar" aria-label="กำลังโหลด" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-6 h-3 border-2 border-ink/60 bg-brand animate-block-fill"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

function MobileLayout() {
  const user = useAuthStore((s) => s.user)
  return (
    // Full-viewport flex column — fills the screen on every device (phone → desktop).
    // Pages own their own max-width/centering; the game can now go truly fullscreen.
    <div className="h-dvh w-full bg-[#F4F7FC] relative overflow-x-hidden flex flex-col">
      {/* flex-1 so h-full pages get a definite height; overflow-hidden clips panels */}
      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
      {user && (
        <Suspense fallback={null}>
          <MiniPlayer />
        </Suspense>
      )}
      {user && <OnboardingModal />}
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

function HubNewsRedirect() {
  const { id } = useParams()
  return <ExternalRedirect to={`https://news.ilovetcas.com/${id}`} />
}

function AppSiteRoutes() {
  return (
    <Routes>
      {/* Admin — full-width desktop, outside mobile frame */}
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Public — landing + auth, outside the mobile frame so the page can scroll */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/news/:id" element={<NewsPostPage />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<MobileLayout />}>
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/music/callback" element={<MusicCallback />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function HubSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HubPage />} />
      <Route path="/home" element={<ExternalRedirect to="https://app.ilovetcas.com/home" />} />
      <Route path="/roadmap" element={<ExternalRedirect to="https://app.ilovetcas.com/roadmap" />} />
      <Route path="/auth" element={<ExternalRedirect to="https://app.ilovetcas.com/auth" />} />
      <Route path="/admin" element={<ExternalRedirect to="https://app.ilovetcas.com/admin" />} />
      <Route path="/news/:id" element={<HubNewsRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RoadmapSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoadmapLanding />} />
      <Route path="/editor" element={<RoadmapPage backPath="/" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function TcasSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TcasExplorerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function NewsSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<NewsHomePage />} />
      <Route path="/:id" element={<NewsPostPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function SchoolSiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SchoolLanding />} />
      <Route path="/app" element={<SchoolAppPage />} />
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
  }
  return <AppSiteRoutes />
}

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SiteRoutes />
    </Suspense>
  )
}

export default App
