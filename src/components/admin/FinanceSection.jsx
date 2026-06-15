import { useState } from 'react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../../firebase'

const PURCHASE_LIMIT = 5000

async function getFinanceData() {
  const snap = await getDocs(
    query(collection(db, 'purchases'), where('status', '==', 'SUCCESS'), limit(PURCHASE_LIMIT)),
  )
  const purchases = snap.docs.map((d) => d.data())

  const totalRevenue = purchases.reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalCoins = purchases.reduce((s, p) => s + (p.coins ?? 0), 0)
  const orderCount = purchases.length

  // Revenue by day (last 30 days)
  const byDay = {}
  purchases.forEach((p) => {
    const ts = p.verifiedAt ?? p.createdAt
    if (!ts?.toDate) return
    const day = ts.toDate().toISOString().slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + (p.amount ?? 0)
  })
  const revenueByDay = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)

  // Revenue by product name
  const byProduct = {}
  purchases.forEach((p) => {
    const key = p.productId ?? 'unknown'
    byProduct[key] = (byProduct[key] ?? 0) + (p.amount ?? 0)
  })
  const revenueByProduct = Object.entries(byProduct)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  return { totalRevenue, totalCoins, orderCount, revenueByDay, revenueByProduct }
}

function Bar({ label, value, max, suffix = '' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-right text-gray-600 text-xs">{label}</span>
      <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>
      <span className="w-16 shrink-0 text-right font-semibold text-gray-800 text-xs">
        {value.toLocaleString('th-TH', { maximumFractionDigits: 2 })}{suffix}
      </span>
    </div>
  )
}

export default function FinanceSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getFinanceData())
    } catch (err) {
      console.error('[FinanceSection]', err)
      setError(err.message ?? 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const maxDay = data ? Math.max(...data.revenueByDay.map(([, v]) => v), 1) : 1
  const maxProd = data ? Math.max(...data.revenueByProduct.map(([, v]) => v), 1) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Finance</h2>
          <p className="text-sm text-gray-500 mt-0.5">รายได้จาก purchases ที่ SUCCESS</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังโหลด...
            </>
          ) : '🔄 โหลดข้อมูล'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          ❌ {error}
        </div>
      )}

      {!data && !loading && (
        <div className="py-24 text-center text-gray-400 text-sm">
          กด "โหลดข้อมูล" เพื่อดูยอดรายได้
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">รายได้รวม (THB)</p>
              <p className="text-2xl font-bold text-brand">
                {data.totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">เหรียญที่ขายได้</p>
              <p className="text-2xl font-bold text-amber-500">🪙 {data.totalCoins.toLocaleString('th-TH')}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
              <p className="text-xs text-gray-500 mb-1">ออเดอร์สำเร็จ</p>
              <p className="text-2xl font-bold text-emerald-600">{data.orderCount}</p>
            </div>
          </div>

          {/* Revenue by day */}
          {data.revenueByDay.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">รายได้รายวัน (30 วันล่าสุด)</h3>
              <div className="space-y-1.5">
                {data.revenueByDay.map(([day, v]) => (
                  <Bar key={day} label={day} value={v} max={maxDay} suffix=" ฿" />
                ))}
              </div>
            </div>
          )}

          {/* Revenue by product */}
          {data.revenueByProduct.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-800 text-sm">รายได้ตาม Product ID</h3>
              <div className="space-y-1.5">
                {data.revenueByProduct.map(([id, v]) => (
                  <Bar key={id} label={id} value={v} max={maxProd} suffix=" ฿" />
                ))}
              </div>
            </div>
          )}

          {data.orderCount === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">ยังไม่มีออเดอร์สำเร็จ</div>
          )}
        </>
      )}
    </div>
  )
}
