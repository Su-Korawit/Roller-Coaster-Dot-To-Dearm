import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { getAdminSections } from './constants/admin'
import OnboardingModal from './components/onboarding/OnboardingModal'

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

function LoadingScreen() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
    >
      <span className="text-5xl mb-5" aria-hidden="true">🎢</span>
      <span className="pixel-font text-[10px] text-purple-300 mb-4">Loading...</span>
      <div
        className="w-48 h-1.5 rounded-full overflow-hidden bg-white/10"
        role="progressbar"
        aria-label="กำลังโหลด"
        aria-busy="true"
      >
        <div
          className="h-full w-1/3 rounded-full animate-loading-slide"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-brand), var(--color-accent-pink), transparent)' }}
        />
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

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  )
}

export default App
