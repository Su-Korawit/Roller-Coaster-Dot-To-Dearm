import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { registerAssets } from '../data/onboardingData'
import { useUserStore } from '../stores/useUserStore'

function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useUserStore((state) => state.setUser)

  const handleStart = (provider) => {
    setUser({ name: 'Sakayanagi Arisu', provider })
    navigate('/select/mbti')
  }

  return (
    <section
      className="relative h-full overflow-hidden"
      style={{
        backgroundImage: `url(${registerAssets.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <TopBar icon="♫" />

      <div className="mt-4 px-6 text-center">
        <h1 className="title-gradient pixel-font text-2xl leading-snug">Roller Coaster</h1>
        <p className="title-gradient pixel-font mt-2 text-xs leading-tight">The best solution</p>
        <p className="title-gradient pixel-font text-xs leading-tight">For self-discovery.</p>
      </div>

      <div className="mt-5 px-6 text-center">
        <div className="mx-auto mb-4 h-px w-full bg-black/80" />
        <p className="title-soft-gradient pixel-font text-xs">Personal, Direction, Journey</p>
      </div>

      <div className="mt-8 px-6">
        <h2 className="text-center text-xl font-bold text-black">ลงทะเบียนเพื่อเริ่มใช้งาน</h2>

        <button
          onClick={() => handleStart('google')}
          className="pixel-font mt-5 flex h-14 w-full items-center justify-between rounded-3xl bg-white px-5 text-sm text-black"
        >
          <span>Login with Google</span>
          <span className="text-xl font-bold text-blue-500">G</span>
        </button>

        <button
          onClick={() => handleStart('microsoft')}
          className="pixel-font mt-3 flex h-14 w-full items-center justify-between rounded-3xl bg-white px-5 text-sm text-black"
        >
          <span>Login with Microsoft</span>
          <span className="text-lg">⊞</span>
        </button>
      </div>

      <button
        onClick={() => navigate('/why')}
        className="pixel-font absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-white"
      >
        <p className="text-xs">Start With Why?</p>
        <p className="text-2xl leading-none">▼</p>
      </button>
    </section>
  )
}

export default RegisterPage
