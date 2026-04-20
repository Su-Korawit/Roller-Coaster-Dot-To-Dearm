import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import CareerPage from './pages/CareerPage'
import HomePage from './pages/HomePage'
import MasteryPage from './pages/MasteryPage'
import MbtiPage from './pages/MbtiPage'
import ProgramPage from './pages/ProgramPage'
import RegisterPage from './pages/RegisterPage'
import UniversityPage from './pages/UniversityPage'
import WhyPage from './pages/WhyPage'
import { useSelectStore } from './stores/useSelectStore'

function RootRedirect() {
  const program = useSelectStore((s) => s.program)
  return program ? <Navigate to="/home" replace /> : <RegisterPage />
}

function MobileLayout() {
  return (
    // Outer: centers the phone frame on desktop, fills full screen on mobile
    <div className="min-h-dvh bg-gray-300 flex justify-center">
      {/* Phone frame — the actual mobile container */}
      <div className="w-full max-w-md min-h-dvh bg-[#F4F7FC] relative overflow-x-hidden flex flex-col shadow-2xl">
        {/* flex-1 so h-full pages get a definite height; overflow-hidden clips panels */}
        <main className="flex-1 relative overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<MobileLayout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/why" element={<WhyPage />} />
        <Route path="/select/mbti" element={<MbtiPage />} />
        <Route path="/select/career" element={<CareerPage />} />
        <Route path="/select/mastery" element={<MasteryPage />} />
        <Route path="/select/university" element={<UniversityPage />} />
        <Route path="/select/program" element={<ProgramPage />} />
        <Route path="/home" element={<HomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
