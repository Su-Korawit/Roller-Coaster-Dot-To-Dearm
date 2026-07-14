// src/components/admin/FarmShopsTab.jsx
import { useState } from 'react'
import { setDoc, deleteDoc } from 'firebase/firestore'
import { refs } from '../../lib/db'
import { useFarmDataStore } from '../../stores/useFarmDataStore'
import { useToast } from './Toast'

const EMPTY_SHOP = { id: '', name: '', buysType: 'produce', sells: [] }

export default function FarmShopsTab() {
  const shops = useFarmDataStore((s) => s.shops)
  const items = useFarmDataStore((s) => s.items)
  const [editing, setEditing] = useState(null) // null | 'new' | shopId string
  const [form, setForm] = useState(EMPTY_SHOP)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const openNew = () => { setForm(EMPTY_SHOP); setEditing('new') }
  const openEdit = (shop) => { setForm({ ...shop }); setEditing(shop.id) }
  const close = () => { setEditing(null); setForm(EMPTY_SHOP) }
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addSellRow = () => patch('sells', [...form.sells, { itemId: '', price: 0 }])
  const removeSellRow = (i) => patch('sells', form.sells.filter((_, idx) => idx !== i))
  const patchSellRow = (i, k, v) => {
    const next = [...form.sells]
    next[i] = { ...next[i], [k]: v }
    patch('sells', next)
  }

  const handleSave = async () => {
    const id = editing === 'new' ? form.id.trim() : editing
    if (!id) { toast?.error('กรุณาใส่ Shop ID'); return }
    if (!form.name.trim()) { toast?.error('กรุณาใส่ชื่อร้าน'); return }
    const invalidRow = form.sells.find(r => !r.itemId || r.price < 0)
    if (invalidRow) { toast?.error('ตรวจสอบรายการขายให้ครบ'); return }
    const payload = {
      id,
      name: form.name.trim(),
      buysType: form.buysType || null,
      sells: form.sells.map(r => ({ itemId: r.itemId, price: Number(r.price) })),
    }
    setSaving(true)
    try {
      await setDoc(refs.farmShop(id), payload)
      useFarmDataStore.getState().setShops({ ...useFarmDataStore.getState().shops, [id]: payload })
      toast?.success('บันทึกแล้ว')
      close()
    } catch (e) {
      toast?.error('บันทึกไม่สำเร็จ: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (shopId) => {
    if (!window.confirm(`ลบร้าน "${shopId}"?`)) return
    try {
      await deleteDoc(refs.farmShop(shopId))
      const next = { ...useFarmDataStore.getState().shops }
      delete next[shopId]
      useFarmDataStore.getState().setShops(next)
      toast?.success('ลบแล้ว')
      if (editing === shopId) close()
    } catch (e) {
      toast?.error('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  const itemOptions = Object.values(items)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{Object.keys(shops).length} ร้าน</p>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90"
        >
          + ร้านใหม่
        </button>
      </div>

      {editing && (
        <div className="neo-card p-5 space-y-4 border-brand">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ ร้านใหม่' : `✏️ แก้ไข ${editing}`}</p>

          {editing === 'new' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Shop ID (ต้องตรงกับ shopId ใน Tiled)</span>
              <input
                value={form.id}
                onChange={(e) => patch('id', e.target.value)}
                placeholder="เช่น seed_shop"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono"
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">ชื่อร้าน</span>
            <input
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              placeholder="เช่น ร้านเมล็ดพันธุ์"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">รับซื้อ</span>
            <select
              value={form.buysType ?? ''}
              onChange={(e) => patch('buysType', e.target.value || null)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">ไม่รับซื้อ</option>
              <option value="produce">รับซื้อ produce ทั้งหมด</option>
            </select>
          </label>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-semibold">รายการขาย</span>
              <button onClick={addSellRow} className="text-xs text-brand hover:underline">+ เพิ่มรายการ</button>
            </div>
            {form.sells.length === 0 && (
              <p className="text-xs text-gray-400 py-2">ยังไม่มีรายการขาย</p>
            )}
            {form.sells.map((row, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <select
                  value={row.itemId}
                  onChange={(e) => patchSellRow(i, 'itemId', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">เลือกไอเทม</option>
                  {itemOptions.map(it => (
                    <option key={it.id} value={it.id}>{it.name} ({it.id})</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={row.price}
                  onChange={(e) => patchSellRow(i, 'price', e.target.value)}
                  placeholder="ราคา"
                  className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
                />
                <span className="text-xs text-gray-400">gold</span>
                <button onClick={() => removeSellRow(i)} className="text-xs text-rose-500 hover:underline">ลบ</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">ยกเลิก</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      <div className="neo-card overflow-x-auto">
        {Object.values(shops).length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีร้าน</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">รายการขาย</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">รับซื้อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(shops).map((shop) => (
                <tr key={shop.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{shop.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{shop.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{shop.sells?.length ?? 0} รายการ</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{shop.buysType ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEdit(shop)} className="text-xs text-brand hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(shop.id)} className="text-xs text-rose-500 hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
