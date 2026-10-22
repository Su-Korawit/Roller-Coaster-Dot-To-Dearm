import { useState, useCallback, useMemo } from 'react'
import { deleteDoc, getDocs, limit, query } from 'firebase/firestore'
import { cols, refs, shapes } from '../../lib/db'
import { useTcasUniversities } from '../../hooks/useMytcas'
import { useToast } from './Toast'
import { setTeacherBadge } from '../../services/schoolBoard'

// Reads the `users` collection client-side (admin-only writes; reads are
// signed-in). Capped at LIST_LIMIT as a safety valve — same posture as
// AnalyticsSection.getAggregate(). Delete is gated to the super-admin by the
// Firestore `allow delete` rule, so a scoped admin's delete simply fails.
const LIST_LIMIT = 2000

async function getUsers() {
  const snap = await getDocs(query(cols.users, limit(LIST_LIMIT)))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export default function UserManagementSection() {
  const [users, setUsers] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const toast = useToast()

  const { universities } = useTcasUniversities()
  const uniNames = useMemo(
    () => new Map(universities.map((u) => [String(u.university_id), u.university_name_th])),
    [universities],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await getUsers())
    } catch (err) {
      console.error('[UserManagementSection]', err)
      setError(err.message || 'โหลดข้อมูลไม่ได้')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = useCallback(async (u) => {
    if (!window.confirm(`ลบผู้ใช้ ${u.displayName || u.email || u.id}? การลบนี้ย้อนกลับไม่ได้`)) return
    setBusyId(u.id)
    try {
      await deleteDoc(refs.user(u.id))
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      toast?.success('ลบผู้ใช้แล้ว')
    } catch (err) {
      console.error('[UserManagementSection] delete', err)
      toast?.error('ลบไม่สำเร็จ (เฉพาะผู้ดูแลระบบหลักเท่านั้น)')
    } finally {
      setBusyId(null)
    }
  }, [toast])

  // Teacher badge (ADR 0018): the super-admin verifies the person out of band, then grants
  // the claim for the school the user declared. The callable itself rejects everyone else.
  const handleTeacher = useCallback(async (u, revoke) => {
    const who = u.displayName || u.email || u.id
    const msg = revoke
      ? `ถอน badge ครูของ ${who}?`
      : `ให้ badge ครูแก่ ${who} ของ ${u.schoolName || u.schoolId}? (ยืนยันตัวตนแล้วเท่านั้น)`
    if (!window.confirm(msg)) return
    setBusyId(u.id)
    try {
      await setTeacherBadge({ uid: u.id, schoolId: u.schoolId, revoke })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, teacherSchoolId: revoke ? null : u.schoolId } : x)))
      toast?.success(revoke ? 'ถอน badge แล้ว' : 'ให้ badge ครูแล้ว (ผู้ใช้ต้องล็อกอินใหม่หรือรอสักครู่)')
    } catch (err) {
      console.error('[UserManagementSection] teacher badge', err)
      toast?.error('ไม่สำเร็จ (เฉพาะผู้ดูแลระบบหลักเท่านั้น)')
    } finally {
      setBusyId(null)
    }
  }, [toast])

  const filtered = useMemo(() => {
    if (!users) return []
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q),
    )
  }, [users, search])

  if (!users && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-500 text-sm">กด Refresh เพื่อโหลดรายชื่อผู้ใช้</p>
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-3xl font-bold text-ink">{users.length.toLocaleString()}</p>
          <p className="text-gray-500 text-sm mt-0.5">ผู้ใช้ทั้งหมด{search && ` · แสดง ${filtered.length}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / อีเมล"
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand w-48"
          />
          <button
            onClick={refresh}
            className="px-5 py-2 rounded-xl border border-brand text-brand font-semibold text-sm hover:bg-brand-soft transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto px-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-semibold">ผู้ใช้</th>
              <th className="px-4 py-3 font-semibold">MBTI</th>
              <th className="px-4 py-3 font-semibold">หลักสูตร</th>
              <th className="px-4 py-3 font-semibold">มหาวิทยาลัย</th>
              <th className="px-4 py-3 font-semibold">สมัครเมื่อ</th>
              <th className="px-4 py-3 font-semibold">ครู</th>
              <th className="px-4 py-3 font-semibold text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const { mbti, program, university: uni } = shapes.readProfile(u)
              const created = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('th-TH') : '—'
              return (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {u.photoURL
                        ? <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{u.displayName || '(ไม่มีชื่อ)'}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email || u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{mbti || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{program ? `#${program}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[12rem] truncate">{uni ? (uniNames.get(String(uni)) ?? uni) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{created}</td>
                  <td className="px-4 py-3">
                    {u.teacherSchoolId
                      ? (
                        <button
                          onClick={() => handleTeacher(u, true)}
                          disabled={busyId === u.id}
                          className="px-2 py-1 rounded-lg bg-brand-soft text-brand-strong text-xs font-semibold disabled:opacity-50"
                          title="คลิกเพื่อถอน badge"
                        >
                          🎓 ครู
                        </button>
                      )
                      : (
                        <button
                          onClick={() => handleTeacher(u, false)}
                          disabled={busyId === u.id || !u.schoolId}
                          title={u.schoolId ? 'ให้ badge ครู' : 'ผู้ใช้ยังไม่ได้เลือกโรงเรียน'}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 disabled:opacity-40"
                        >
                          ให้ badge
                        </button>
                      )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={busyId === u.id}
                      className="px-3 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                    >
                      {busyId === u.id ? '...' : 'ลบ'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">ไม่พบผู้ใช้</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
