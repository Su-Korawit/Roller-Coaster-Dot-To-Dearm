import { useState } from 'react'
import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import { ADMIN_UID } from '../../constants/admin'
import Button from '../ui/Button'

// Gate for the Studio. The server checks the same role on every write; this only
// decides what the page shows. Creator = custom claim set by `grantCreatorRole`.
export default function RequireCreator() {
  const user = useAuthStore((s) => s.user)
  const claims = useAuthStore((s) => s.claims)
  const loading = useAuthStore((s) => s.loading)
  const refreshClaims = useAuthStore((s) => s.refreshClaims)
  const [refreshing, setRefreshing] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/auth" replace />
  if (claims?.creator === true || user.uid === ADMIN_UID) return <Outlet />

  const refresh = async () => {
    setRefreshing(true)
    try {
      await refreshClaims()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-dvh bg-mist flex items-center justify-center px-4">
      <div className="px-card bg-white p-6 max-w-sm w-full text-center flex flex-col gap-3">
        <p className="font-bold text-ink">บัญชีนี้ยังไม่มีสิทธิ์เขียนบทความ</p>
        <p className="text-sm text-ink-soft">
          ถ้าเพิ่งได้รับสิทธิ์จากทีมงาน ลองรีเฟรชสิทธิ์ดูอีกครั้ง
        </p>
        <Button variant="secondary" onClick={refresh} disabled={refreshing}>
          ลองรีเฟรชสิทธิ์
        </Button>
        <Link to="/home" className="text-sm text-ink-soft underline">กลับหน้าหลัก</Link>
      </div>
    </div>
  )
}
