import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import WizardStepper from '../components/WizardStepper'
import { universities as legacyUniversities } from '../data/onboardingData'
import { useTcasUniversities } from '../hooks/useMytcas'
import { useSelectStore } from '../stores/useSelectStore'
import { useAuthStore } from '../stores/useAuthStore'
import { syncSelectToFirestore } from '../utils/syncSelectToFirestore'

// Old curated logos kept as a fallback when the official CDN logo is missing.
const legacyByName = new Map(legacyUniversities.map((u) => [u.name, u]))

// Initials for the last-resort badge (official catalog has no shortName).
function badgeText(uni) {
  const legacy = legacyByName.get(uni.university_name_th)
  if (legacy?.shortName) return legacy.shortName
  const en = (uni.university_name_en || '').trim()
  if (en) return en.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase()
  return uni.university_name_th.slice(0, 3)
}

// CDN logo → old local image → initials badge.
function UniversityLogo({ uni }) {
  const localImage = legacyByName.get(uni.university_name_th)?.image
  const [stage, setStage] = useState('cdn') // 'cdn' | 'local' | 'badge'

  const src = stage === 'cdn' ? uni.logo_url : stage === 'local' ? localImage : null

  if (src) {
    return (
      <img
        src={src}
        alt={uni.university_name_th}
        className="mx-auto h-14 w-14 object-contain"
        onError={() => setStage(stage === 'cdn' && localImage ? 'local' : 'badge')}
      />
    )
  }

  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-purple-500">
      <span className="pixel-font text-[9px] font-bold text-white">{badgeText(uni)}</span>
    </div>
  )
}

function UniversityPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { universities, loading, error } = useTcasUniversities()
  const selected = useSelectStore((state) => state.university)
  const setUniversity = useSelectStore((state) => state.setUniversity)

  const filtered = useMemo(
    () => universities.filter((item) => {
      const q = query.toLowerCase()
      return (
        item.university_name_th.toLowerCase().includes(q) ||
        (item.university_name_en || '').toLowerCase().includes(q)
      )
    }),
    [universities, query],
  )

  return (
    <section className="flex h-dvh flex-col bg-linear-to-b from-pink-200 via-pink-100 to-emerald-300">
      <TopBar />

      <div className="shrink-0 px-6 pt-4">
        <h1 className="title-gradient pixel-font text-xl leading-tight">University</h1>
        <WizardStepper step={2} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-2">
        <div className="rounded-[20px] bg-white/55 p-4">
          {loading ? (
            <p className="pixel-font py-10 text-center text-xs text-black/60">กำลังโหลดข้อมูล...</p>
          ) : error ? (
            <p className="pixel-font py-10 text-center text-xs text-red-500">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filtered.map((university) => (
                <button
                  key={university.university_id}
                  onClick={() => {
                    setUniversity(university.university_id)
                    syncSelectToFirestore(useAuthStore.getState().user?.uid)
                  }}
                  className={`relative rounded-2xl bg-white p-3 ${selected === university.university_id ? 'ring-4 ring-pink-400' : ''}`}
                  title={university.university_name_th}
                >
                  <UniversityLogo uni={university} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/50 bg-white/40 px-6 py-4 backdrop-blur-md">
        <p className="pixel-font mb-2 text-center text-[10px] text-black/60">↓ Scroll down or Search</p>
        <div className="flex items-center rounded-2xl bg-white px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search..."
            className="pixel-font w-full bg-transparent text-sm outline-none"
          />
          <span className="text-lg">⌕</span>
        </div>
        <button
          onClick={() => navigate('/select/program')}
          disabled={!selected}
          className="pixel-font mt-3 h-11 w-full rounded-2xl bg-sky-300 text-sm text-black disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default UniversityPage
