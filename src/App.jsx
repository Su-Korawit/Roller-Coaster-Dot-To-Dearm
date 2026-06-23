import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import CareerPage from './pages/CareerPage'
import HomePage from './pages/HomePage'
import MasteryPage from './pages/MasteryPage'
import MbtiPage from './pages/MbtiPage'
import ProgramPage from './pages/ProgramPage'
import RegisterPage from './pages/RegisterPage'
import UniversityPage from './pages/UniversityPage'
import WhyPage from './pages/WhyPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import RoadmapPage from './pages/RoadmapPage'
import WelcomePage from './pages/WelcomePage'
import { useSelectStore } from './stores/useSelectStore'
import { useAuthStore } from './stores/useAuthStore'
import { getAdminSections } from './constants/admin'

function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
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

  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

function RootRedirect() {
  const program = useSelectStore((s) => s.program)
  return program ? <Navigate to="/home" replace /> : <RegisterPage />
}

function MobileLayout() {
  return (
    // Full-viewport flex column — fills the screen on every device (phone → desktop).
    // Pages own their own max-width/centering; the game can now go truly fullscreen.
    <div className="h-dvh w-full bg-[#F4F7FC] relative overflow-x-hidden flex flex-col">
      {/* flex-1 so h-full pages get a definite height; overflow-hidden clips panels */}
      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
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
    <Routes>
      {/* Admin — full-width desktop, outside mobile frame */}
      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Public — landing + auth, outside the mobile frame so the page can scroll */}
      <Route path="/" element={<WelcomePage />} />
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<MobileLayout />}>
        <Route element={<RequireAuth />}>
          <Route path="/start" element={<RootRedirect />} />
          <Route path="/why" element={<WhyPage />} />
          <Route path="/select/mbti" element={<MbtiPage />} />
          <Route path="/select/career" element={<CareerPage />} />
          <Route path="/select/mastery" element={<MasteryPage />} />
          <Route path="/select/university" element={<UniversityPage />} />
          <Route path="/select/program" element={<ProgramPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
