import { useState, useCallback, useMemo } from 'react'
import { getDocs, limit, query } from 'firebase/firestore'
import { MBTI_TYPES } from '../../game/assetManifest'
import { cols, shapes } from '../../lib/db'
import { useTcasUniversities } from '../../hooks/useMytcas'

// Reads the `users` collection client-side (admin-only Firestore rule guards
// this). Capped at AGG_LIMIT as a safety valve so a huge collection can't blow up
// the admin page. Real fix once user count grows past ~5k: swap getAggregate() to
// a Cloud-Function maintained stats doc — the function signature stays the same.
const AGG_LIMIT = 2000
async function getAggregate() {
  const snap = await getDocs(query(cols.users, limit(AGG_LIMIT)))
  const users = snap.docs.map((d) => d.data())

  const total = users.length

  // Signups bucketed by day (YYYY-MM-DD)
  const byDay = {}
  users.forEach((u) => {
    if (!u.createdAt?.toDate) return
    const day = u.createdAt.toDate().toISOString().slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  })
  const signupsByDay = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30) // last 30 days

  // MBTI distribution
  const mbtiCounts = {}
  users.forEach((u) => {
    const m = shapes.readProfile(u).mbti
    if (m) mbtiCounts[m] = (mbtiCounts[m] ?? 0) + 1
  })

  // University distribution (top 10)
  const uniCounts = {}
  users.forEach((u) => {
    const uni = shapes.readProfile(u).university
    if (uni) uniCounts[uni] = (uniCounts[uni] ?? 0) + 1
  })
  const topUniversities = Object.entries(uniCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  // Program distribution (top 10)
  const progCounts = {}
  users.forEach((u) => {
    const p = shapes.readProfile(u).program
    if (p) progCounts[p] = (progCounts[p] ?? 0) + 1
  })
  const topPrograms = Object.entries(progCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  return { total, signupsByDay, mbtiCounts, topUniversities, topPrograms }
}

function Bar({ label, value, max, color = 'bg-brand' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 shrink-0 truncate text-right text-gray-600 text-xs">{label}</span>
      <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>
      <span className="w-8 shrink-0 text-right font-semibold text-gray-800 text-xs">{value}</span>
    </div>
  )
}

export default function AnalyticsSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // university_id → Thai name. Counts are keyed by id (stored in Firestore);
  // Object.entries() in getAggregate() stringifies them, so key the map with
  // String() too or lookups silently miss.
  const { universities } = useTcasUniversities()
  const uniNames = useMemo(
    () => new Map(universities.map((u) => [String(u.university_id), u.university_name_th])),
    [universities],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getAggregate())
    } catch (err) {
      console.error('[AnalyticsSection]', err)
      setError(err.message || 'โหลดข้อมูลไม่ได้')
    } finally {
      setLoading(false)
    }
  }, [])

  if (!data && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500 text-sm">กด Refresh เพื่อโหลดข้อมูล</p>
        <button
          onClick={refresh}
          className="px-6 py-2 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand-strong transition-colors"
        >
          Refresh
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="py-24 text-center text-gray-400 text-sm animate-pulse">กำลังโหลด...</div>
  }

  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button onClick={refresh} className="px-6 py-2 rounded-xl bg-brand text-white font-semibold text-sm">
          ลองใหม่
        </button>
      </div>
    )
  }

  const { total, signupsByDay, mbtiCounts, topUniversities, topPrograms } = data
  const maxMbti = Math.max(...MBTI_TYPES.map((m) => mbtiCounts[m] ?? 0), 1)
  const maxUni  = Math.max(...topUniversities.map(([, v]) => v), 1)
  const maxProg = Math.max(...topPrograms.map(([, v]) => v), 1)
  const maxDay  = Math.max(...signupsByDay.map(([, v]) => v), 1)

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-bold text-ink">{total.toLocaleString()}</p>
          <p className="text-gray-500 text-sm mt-1">ผู้ใช้ทั้งหมด</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-5 py-2 rounded-xl border border-brand text-brand font-semibold text-sm hover:bg-brand-soft transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Signups over time */}
      {signupsByDay.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">สมัครสมาชิก (30 วันล่าสุด)</h3>
          <div className="space-y-1.5">
            {signupsByDay.map(([day, count]) => (
              <Bar key={day} label={day.slice(5)} value={count} max={maxDay} color="bg-accent-pink" />
            ))}
          </div>
        </section>
      )}

      {/* MBTI distribution */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">MBTI Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {MBTI_TYPES.map((m) => (
            <Bar key={m} label={m} value={mbtiCounts[m] ?? 0} max={maxMbti} color="bg-brand" />
          ))}
        </div>
      </section>

      {/* University top-10 */}
      {topUniversities.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Universities</h3>
          <div className="space-y-1.5">
            {topUniversities.map(([uni, count]) => (
              <Bar key={uni} label={uniNames.get(uni) ?? uni} value={count} max={maxUni} color="bg-brand-strong" />
            ))}
          </div>
        </section>
      )}

      {/* Program top-10 */}
      {topPrograms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Programs</h3>
          <div className="space-y-1.5">
            {topPrograms.map(([prog, count]) => (
              <Bar key={prog} label={`หลักสูตร #${prog}`} value={count} max={maxProg} color="bg-emerald-500" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
