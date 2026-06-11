import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import CareerPage from './pages/CareerPage'
import HomePage from './pages/HomePage'
import MasteryPage from './pages/MasteryPage'
import MbtiPage from './pages/MbtiPage'
import ProgramPage from './pages/ProgramPage'
import RegisterPage from './pages/RegisterPage'
import UniversityPage from './pages/UniversityPage'
import WhyPage from './pages/WhyPage'
import AuthPage from './pages/AuthPage'
import { useSelectStore } from './stores/useSelectStore'
import { useAuthStore } from './stores/useAuthStore'

function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
      >
        <span className="text-4xl mb-4">🎢</span>
        <span className="pixel-font text-[8px] text-purple-300 animate-pulse">Loading...</span>
      </div>
    )
  }

  if (!user) return <AuthPage />
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
    <div className="min-h-dvh w-full bg-[#F4F7FC] relative overflow-x-hidden flex flex-col">
      {/* flex-1 so h-full pages get a definite height; overflow-hidden clips panels */}
      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<MobileLayout />}>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/why" element={<WhyPage />} />
          <Route path="/select/mbti" element={<MbtiPage />} />
          <Route path="/select/career" element={<CareerPage />} />
          <Route path="/select/mastery" element={<MasteryPage />} />
          <Route path="/select/university" element={<UniversityPage />} />
          <Route path="/select/program" element={<ProgramPage />} />
          <Route path="/home" element={<HomePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
