import { useMemo, useState, useEffect } from 'react'
import StepScreen from '../ui/StepScreen'
import { universities as legacyUniversities } from '../../data/onboardingData'
import { useTcasUniversities } from '../../hooks/useMytcas'
import { usePlansStore } from '../../stores/usePlansStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { syncSelectToFirestore } from '../../utils/syncSelectToFirestore'
import { cloudAsset } from '../../utils/cloudAsset'

const legacyByName = new Map(legacyUniversities.map((u) => [u.name, u]))

function badgeText(uni) {
  const legacy = legacyByName.get(uni.university_name_th)
  if (legacy?.shortName) return legacy.shortName
  const en = (uni.university_name_en || '').trim()
  if (en) return en.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase()
  return uni.university_name_th.slice(0, 3)
}

// Logo fallback chain: MyTCAS CDN → Firebase Storage → bundled local → badge
// Stages: 'cdn' → 'cloud' → 'local' → 'badge'
function UniversityLogo({ uni }) {
  const legacy = legacyByName.get(uni.university_name_th)
  const localImage = legacy?.image ?? null

  // Derive the Storage path from the bundled image URL's filename segment.
  const [cloudUrl, setCloudUrl] = useState(null)
  useEffect(() => {
    if (!localImage) return
    const filename = localImage.split('/').pop()
    cloudAsset(`media/university/${filename}`, { fallback: null }).then(setCloudUrl)
  }, [localImage])

  const [stage, setStage] = useState('cdn')

  const src =
    stage === 'cdn'   ? uni.logo_url :
    stage === 'cloud' ? cloudUrl     :
    stage === 'local' ? localImage   : null

  function nextStage() {
    if (stage === 'cdn')   return setStage(cloudUrl ? 'cloud' : localImage ? 'local' : 'badge')
    if (stage === 'cloud') return setStage(localImage ? 'local' : 'badge')
    if (stage === 'local') return setStage('badge')
  }

  if (src) {
    return (
      <img
        src={src}
        alt={uni.university_name_th}
        className="mx-auto h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 object-contain"
        onError={nextStage}
      />
    )
  }

  return (
    <div className="mx-auto flex h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-purple-500">
      <span className="pixel-font text-[9px] md:text-[11px] font-bold text-white">{badgeText(uni)}</span>
    </div>
  )
}

// Step 4 of OnboardingModal — WizardStepper index 2 ("University").
function UniversityStep({ onNext }) {
  const [query, setQuery] = useState('')
  const { universities, loading, error } = useTcasUniversities()
  const plans = usePlansStore((state) => state.plans)
  const activePlanId = usePlansStore((state) => state.activePlanId)
  const updatePlan = usePlansStore((state) => state.updatePlan)
  const uid = useAuthStore((state) => state.user?.uid)
  const selected = plans.find((plan) => plan.id === activePlanId)?.university ?? null

  const commitUniversity = (universityId) => {
    if (!activePlanId) return
    updatePlan(activePlanId, { university: universityId })
    if (uid) syncSelectToFirestore(uid)
  }

  const filtered = useMemo(
    () =>
      universities.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.university_name_th.toLowerCase().includes(q) ||
          (item.university_name_en || '').toLowerCase().includes(q)
        )
      }),
    [universities, query],
  )

  return (
    <StepScreen
      step={2}
      title="University"
      maxWidth="max-w-5xl"
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหามหาวิทยาลัย"
      onNext={onNext}
      nextDisabled={!selected}
    >
      <div className="mx-auto max-w-5xl rounded-[20px] bg-white/55 p-4 md:p-6">
        {loading ? (
          <p
            className="py-10 text-center text-sm text-gray-500"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            กำลังโหลดข้อมูล...
          </p>
        ) : error ? (
          <p
            className="py-10 text-center text-sm text-red-500"
            style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
          >
            โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง
          </p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
            {filtered.map((university) => (
              <button
                key={university.university_id}
                onClick={() => commitUniversity(university.university_id)}
                aria-label={university.university_name_th}
                aria-pressed={selected === university.university_id}
                className={`relative rounded-2xl bg-white p-3 transition-all hover:shadow-md active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
                  ${selected === university.university_id ? 'ring-4 ring-pink-400 shadow-md' : 'shadow-sm'}`}
              >
                <UniversityLogo uni={university} />
              </button>
            ))}
          </div>
        )}
      </div>
    </StepScreen>
  )
}

export default UniversityStep
