import { useMemo, useState, useEffect } from 'react'
import StepScreen from '../ui/StepScreen'
import { universities as legacyUniversities } from '../../data/onboardingData'
import { useTcasUniversities } from '../../hooks/useMytcas'
import { usePlansStore } from '../../stores/usePlansStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { syncSelectToFirestore } from '../../utils/syncSelectToFirestore'
import { cloudAsset } from '../../utils/cloudAsset'

const legacyByName = new Map(legacyUniversities.map((u) => [u.name, u]))

function normalizeName(name) {
  return (name || '').replace(/\s+/g, ' ').trim()
}

function legacyForUni(uni) {
  const exact = legacyByName.get(uni.university_name_th)
  if (exact) return exact
  const norm = normalizeName(uni.university_name_th)
  for (const u of legacyUniversities) {
    const legacyNorm = normalizeName(u.name)
    if (legacyNorm === norm) return u
    if (legacyNorm.startsWith(norm) || norm.startsWith(legacyNorm)) return u
  }
  return null
}

function badgeText(uni) {
  const legacy = legacyForUni(uni)
  if (legacy?.shortName) return legacy.shortName
  const en = (uni.university_name_en || '').trim()
  if (en) return en.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase()
  return uni.university_name_th.slice(0, 3)
}

// Logo fallback chain: MyTCAS CDN → Firebase Storage → bundled local → badge
// Stages: 'cdn' → 'cloud' → 'local' → 'badge'
export function UniversityLogo({ uni }) {
  const legacy = legacyForUni(uni)
  const localImage = legacy?.image ?? null

  const [cloudUrl, setCloudUrl] = useState(null)
  const [cloudResolved, setCloudResolved] = useState(false)
  useEffect(() => {
    if (!localImage) {
      setCloudResolved(true)
      return
    }
    const filename = localImage.split('/').pop()
    cloudAsset(`media/university/${filename}`, { fallback: null })
      .then((url) => {
        setCloudUrl(url)
        setCloudResolved(true)
      })
  }, [localImage])

  const [stage, setStage] = useState('cdn')
  const advance = () =>
    setStage((s) =>
      s === 'cdn' ? 'cloud' : s === 'cloud' ? 'local' : s === 'local' ? 'badge' : 'badge',
    )

  useEffect(() => {
    if (stage === 'cdn' && !uni.logo_url) advance()
  }, [stage, uni.logo_url])

  useEffect(() => {
    if (stage === 'cloud' && cloudResolved && !cloudUrl) advance()
  }, [stage, cloudResolved, cloudUrl])

  const src =
    stage === 'cdn'   ? uni.logo_url :
    stage === 'cloud' ? cloudUrl :
    stage === 'local' ? localImage : null

  if (src) {
    return (
      <img
        src={src}
        alt={uni.university_name_th}
        className="mx-auto h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 object-contain"
        onError={advance}
      />
    )
  }
  if (stage === 'cloud' && !cloudResolved) {
    return (
      <div
        className="mx-auto h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-full bg-paper animate-pulse"
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="mx-auto flex h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 items-center justify-center rounded-full bg-brand-strong">
      <span className="pixel-font text-[10px] md:text-[11px] font-bold text-white">{badgeText(uni)}</span>
    </div>
  )
}

// Step 4 of OnboardingModal — WizardStepper index 2 ("University").
function UniversityStep({ onNext, onBack }) {
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
      title="University"
      maxWidth="max-w-5xl"
      searchValue={query}
      onSearchChange={(e) => setQuery(e.target.value)}
      searchLabel="ค้นหามหาวิทยาลัย"
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!selected}
    >
      <div className="mx-auto max-w-5xl neo-card bg-surface p-4 md:p-6">
        {loading ? (
          <p className="thai-font py-10 text-center text-sm text-ink-soft">
            กำลังโหลดข้อมูล...
          </p>
        ) : error ? (
          <p className="thai-font py-10 text-center text-sm text-danger">
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
                className={`relative rounded-xl bg-surface border-2 p-3 transition-all active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
                  ${selected === university.university_id ? 'border-ink shadow-hard-sm bg-brand-soft' : 'border-ink/25 hover:border-ink/60'}`}
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
