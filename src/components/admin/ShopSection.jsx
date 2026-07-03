import { useEffect, useState } from 'react'
import {
  addDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { cols, refs } from '../../lib/db'
import { useToast } from './Toast'

const CATEGORIES = ['coins', 'premium', 'subscription', 'event']

const EMPTY = { name: '', coins: '', price: '', image: '🪙', category: 'coins', active: true, order: 0 }

export default function ShopSection() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | product id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(cols.shopProducts, orderBy('order', 'asc')))
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      toast?.error('โหลดสินค้าไม่สำเร็จ: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (p) => { setForm({ ...p, coins: String(p.coins), price: String(p.price), order: String(p.order ?? 0) }); setEditing(p.id) }
  const closeForm = () => { setEditing(null); setForm(EMPTY) }
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast?.error('กรุณาใส่ชื่อสินค้า'); return }
    const coins = parseInt(form.coins, 10)
    const price = parseFloat(form.price)
    const order = parseInt(form.order, 10) || 0
    if (!coins || coins <= 0) { toast?.error('จำนวนเหรียญต้องมากกว่า 0'); return }
    if (!price || price <= 0) { toast?.error('ราคาต้องมากกว่า 0'); return }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        coins,
        price,
        image: form.image.trim() || '🪙',
        category: form.category,
        active: form.active,
        order,
        updatedAt: serverTimestamp(),
      }
      if (editing === 'new') {
        await addDoc(cols.shopProducts, { ...payload, createdAt: serverTimestamp() })
        toast?.success('เพิ่มสินค้าแล้ว')
      } else {
        await updateDoc(refs.product(editing), payload)
        toast?.success('บันทึกแล้ว')
      }
      closeForm()
      await load()
    } catch (err) {
      console.error('[ShopSection] save', err)
      toast?.error('บันทึกไม่สำเร็จ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('ลบสินค้านี้?')) return
    try {
      await deleteDoc(refs.product(id))
      toast?.success('ลบแล้ว')
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      toast?.error('ลบไม่สำเร็จ: ' + err.message)
    }
  }

  const handleToggleActive = async (product) => {
    try {
      await updateDoc(refs.product(product.id), { active: !product.active, updatedAt: serverTimestamp() })
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, active: !p.active } : p))
    } catch (err) {
      toast?.error('อัปเดตไม่สำเร็จ')
    }
  }

  if (loading) return <div className="py-24 text-center text-gray-400 text-sm animate-pulse">กำลังโหลด...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Shop Products</h2>
          <p className="text-sm text-gray-500 mt-0.5">จัดการแพ็คเกจเหรียญในร้านค้า</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
        >
          + เพิ่มสินค้า
        </button>
      </div>

      {/* Product form */}
      {editing && (
        <div className="rounded-2xl border-2 border-brand/30 bg-white p-5 shadow-sm space-y-4">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ สินค้าใหม่' : '✏️ แก้ไขสินค้า'}</p>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-xs text-gray-500">ชื่อสินค้า</span>
              <input
                value={form.name}
                onChange={(e) => patch('name', e.target.value)}
                placeholder="เช่น เหรียญ 100 แถม 10"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">เหรียญ (coins)</span>
              <input
                type="number"
                value={form.coins}
                onChange={(e) => patch('coins', e.target.value)}
                placeholder="100"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ราคา (THB)</span>
              <input
                type="number"
                value={form.price}
                onChange={(e) => patch('price', e.target.value)}
                placeholder="49"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Image (emoji)</span>
              <input
                value={form.image}
                onChange={(e) => patch('image', e.target.value)}
                placeholder="🪙"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">หมวดหมู่</span>
              <select
                value={form.category}
                onChange={(e) => patch('category', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ลำดับ (order)</span>
              <input
                type="number"
                value={form.order}
                onChange={(e) => patch('order', e.target.value)}
                placeholder="0"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => patch('active', e.target.checked)}
                className="w-4 h-4 accent-brand"
              />
              <span className="text-sm text-gray-700">เปิดขาย (active)</span>
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={closeForm}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      {/* Product list */}
      {products.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีสินค้า กด "+ เพิ่มสินค้า" เพื่อเริ่ม</div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">สินค้า</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">เหรียญ</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">ราคา</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">สถานะ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.image}</span>
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category} · order {p.order ?? 0}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-brand-strong">🪙 {p.coins}</td>
                  <td className="px-4 py-3 text-right font-semibold text-accent-pink">{p.price} ฿</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {p.active ? 'เปิด' : 'ปิด'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs text-brand hover:underline"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
