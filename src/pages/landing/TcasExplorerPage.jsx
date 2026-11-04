import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { Search, LayoutList, LockOpen } from 'lucide-react'
import { SITES } from '../../constants/sites'
import { useTcasUniversities, useTcasFaculties, useTcasPrograms } from '../../hooks/useMytcas'
import { UniversityLogo } from '../../components/onboarding/UniversityStep'
import SelectableRow from '../../components/ui/SelectableRow'
import SiteNav from '../../components/landing/SiteNav'
import WelcomeFooter from '../../components/welcome/WelcomeFooter'

const BENEFITS = [
  { icon: Search, title: 'ค้นหาเร็ว', text: 'ค้นหามหาวิทยาลัย คณะ และหลักสูตรจากข้อมูล MyTCAS จริง' },
  { icon: LayoutList, title: 'รอบรับสมัคร', text: 'ดูรอบ Portfolio Quota Admission บนแต่ละหลักสูตร' },
  { icon: LockOpen, title: 'ใช้ฟรี', text: 'ไม่ต้องล็อกอิน ค้นหาได้ไม่จำกัด' },
]

export default function TcasExplorerPage() {
  const [query, setQuery] = useState('')
  const [selectedUni, setSelectedUni] = useState(null)
  const [selectedFaculty, setSelectedFaculty] = useState(null)

  const { universities, loading, error, dataSource } = useTcasUniversities()
  const { faculties, loading: facLoading } = useTcasFaculties(selectedUni)
  const { programs, loading: progLoading } = useTcasPrograms(selectedUni, selectedFaculty)

  useEffect(() => {
    document.title = SITES.tcas.title
  }, [])

  const filteredUnis = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return universities
    return universities.filter(
      (u) =>
        u.university_name_th.toLowerCase().includes(q) ||
        (u.university_name_en || '').toLowerCase().includes(q),
    )
  }, [universities, query])

  const filteredFaculties = useMemo(() => {
    const q = query.toLowerCase()
    return faculties.filter((f) => f.faculty_name_th.toLowerCase().includes(q))
  }, [faculties, query])

  const filteredPrograms = useMemo(() => {
    const q = query.toLowerCase()
    return programs.filter(
      (p) =>
        p.program_name_th.toLowerCase().includes(q) ||
        (p.field_name_th || '').toLowerCase().includes(q),
    )
  }, [programs, query])

  const hubHref = import.meta.env.DEV ? '/?site=hub' : SITES.hub.path

  return (
    <main data-testid="tcas-explorer" className="min-h-dvh w-full bg-mist overflow-x-hidden">
      <SiteNav currentKey="tcas" />

      <header className="pixel-checker border-b-2 border-ink bg-paper px-6 py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="wordmark-font mb-4 text-xs uppercase text-brand-strong md:text-xs">
            {SITES.tcas.pixelName}
          </p>
          <h1 className="thai-font text-3xl font-extrabold leading-tight text-ink md:text-4xl">
            {SITES.tcas.h1}
          </h1>
          <p className="thai-font mt-4 text-base leading-relaxed text-ink-soft">{SITES.tcas.intro}</p>
        </div>
      </header>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-3xl grid gap-4 sm:grid-cols-3 mb-8">
          {BENEFITS.map((b) => {
            const Icon = b.icon
            return (
              <div key={b.title} className="px-card p-4">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-brand-soft">
                  <Icon size={20} strokeWidth={2.5} className="text-brand-strong" aria-hidden="true" />
                </span>
                <h2 className="thai-font mb-1 text-sm font-bold text-ink">{b.title}</h2>
                <p className="thai-font text-xs leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            )
          })}
        </div>

        <div className="mx-auto max-w-3xl px-card p-4 md:p-6">
          <label className="thai-font text-sm font-semibold text-ink block mb-2">
            ค้นหามหาวิทยาลัย / คณะ / หลักสูตร
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="พิมพ์ชื่อมหาวิทยาลัย คณะ หรือหลักสูตร..."
            className="w-full rounded-xl border-2 border-ink/20 px-4 py-3 thai-font text-sm outline-none focus:border-brand mb-4"
          />

          {dataSource === 'snapshot' && (
            <p className="thai-font mb-4 rounded-lg border-2 border-ink/25 bg-brand-soft px-3 py-2 text-center text-xs text-ink-soft">
              ข้อมูล TCAS กำลังอัปเดตสำหรับรอบใหม่ — แสดงข้อมูลรอบก่อนหน้าไปพลางก่อน
            </p>
          )}

          {!selectedUni && (
            <>
              {loading ? (
                <p className="thai-font py-8 text-center text-sm text-ink-soft">กำลังโหลด...</p>
              ) : error ? (
                <p className="thai-font py-8 text-center text-sm text-danger">โหลดข้อมูลไม่สำเร็จ</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filteredUnis.map((uni) => (
                    <button
                      key={uni.university_id}
                      type="button"
                      onClick={() => { setSelectedUni(uni.university_id); setQuery('') }}
                      className="rounded-xl border-2 border-ink/25 p-3 hover:border-brand active:scale-95 transition-all"
                      aria-label={uni.university_name_th}
                    >
                      <UniversityLogo uni={uni} />
                      <p className="thai-font text-xs text-ink mt-2 line-clamp-2">{uni.university_name_th}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedUni && !selectedFaculty && (
            <>
              <button
                type="button"
                onClick={() => setSelectedUni(null)}
                className="thai-font text-sm text-brand-strong mb-3"
              >
                ← เลือกมหาวิทยาลัยใหม่
              </button>
              {facLoading ? (
                <p className="thai-font py-8 text-center text-sm text-ink-soft">กำลังโหลดคณะ...</p>
              ) : (
                <div className="space-y-2">
                  {filteredFaculties.map((fac) => (
                    <SelectableRow
                      key={fac.faculty_id}
                      title={fac.faculty_name_th}
                      selected={false}
                      onClick={() => { setSelectedFaculty(fac.faculty_id); setQuery('') }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {selectedUni && selectedFaculty && (
            <>
              <button
                type="button"
                onClick={() => setSelectedFaculty(null)}
                className="thai-font text-sm text-brand-strong mb-3"
              >
                ← เลือกคณะใหม่
              </button>
              {progLoading ? (
                <p className="thai-font py-8 text-center text-sm text-ink-soft">กำลังโหลดหลักสูตร...</p>
              ) : filteredPrograms.length === 0 ? (
                <p className="thai-font py-8 text-center text-sm text-ink-soft">ไม่พบหลักสูตร</p>
              ) : (
                <div className="space-y-2">
                  {filteredPrograms.map((prog) => (
                    <div key={prog.program_id} className="px-card p-4">
                      <p className="thai-font text-sm font-semibold text-ink">{prog.program_name_th}</p>
                      {prog.field_name_th && (
                        <p className="thai-font text-xs text-ink-soft mt-1">{prog.field_name_th}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <footer className="px-6 pb-6 text-center">
        <a href={hubHref} className="thai-font text-sm text-brand-strong hover:underline">
          ← กลับหน้าแรก I LOVE TCAS
        </a>
      </footer>

      <WelcomeFooter />
    </main>
  )
}
