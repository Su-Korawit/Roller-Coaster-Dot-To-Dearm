// src/components/admin/FarmItemsTab.jsx
import { useState } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useFarmDataStore } from '../../stores/useFarmDataStore'
import { useToast } from './Toast'

const ITEM_TYPES = ['seed', 'produce']
const EMPTY = { id: '', name: '', type: 'seed', plantId: '', buyPrice: 0, sellPrice: 0, stackMax: 99, iconIndex: 0 }

export default function FarmItemsTab() {
  const items = useFarmDataStore((s) => s.items)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (item) => { setForm({ ...item }); setEditing(item.id) }
  const close = () => { setEditing(null); setForm(EMPTY) }
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const id = editing === 'new' ? form.id.trim() : editing
    if (!id) { toast?.error('กรุณาใส่ Item ID'); return }
    if (!form.name.trim()) { toast?.error('กรุณาใส่ชื่อไอเทม'); return }
    const payload = {
      id,
      name: form.name.trim(),
      type: form.type,
      plantId: form.type === 'seed' ? form.plantId.trim() : '',
      buyPrice: Number(form.buyPrice),
      sellPrice: Number(form.sellPrice),
      stackMax: Number(form.stackMax) || 99,
      iconIndex: Number(form.iconIndex) || 0,
    }
    setSaving(true)
    try {
      await setDoc(doc(db, 'farmItems', id), payload)
      useFarmDataStore.getState().setItems({ ...useFarmDataStore.getState().items, [id]: payload })
      toast?.success('บันทึกแล้ว')
      close()
    } catch (e) {
      toast?.error('บันทึกไม่สำเร็จ: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm(`ลบไอเทม "${itemId}"?`)) return
    try {
      await deleteDoc(doc(db, 'farmItems', itemId))
      const next = { ...useFarmDataStore.getState().items }
      delete next[itemId]
      useFarmDataStore.getState().setItems(next)
      toast?.success('ลบแล้ว')
      if (editing === itemId) close()
    } catch (e) {
      toast?.error('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{Object.keys(items).length} ไอเทม</p>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90">+ ไอเทมใหม่</button>
      </div>

      {editing && (
        <div className="rounded-2xl border-2 border-brand/30 bg-white p-5 shadow-sm space-y-4">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ ไอเทมใหม่' : `✏️ แก้ไข ${editing}`}</p>
          <div className="grid grid-cols-2 gap-4">
            {editing === 'new' && (
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-gray-500">Item ID</span>
                <input value={form.id} onChange={e => patch('id', e.target.value)} placeholder="เช่น turnip_seed" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
              </label>
            )}
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-xs text-gray-500">ชื่อ</span>
              <input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="เช่น เมล็ดผักกาด" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ประเภท</span>
              <select value={form.type} onChange={e => patch('type', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            {form.type === 'seed' && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Plant ID</span>
                <input value={form.plantId} onChange={e => patch('plantId', e.target.value)} placeholder="เช่น turnip" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ราคาซื้อกลาง (buyPrice)</span>
              <input type="number" value={form.buyPrice} onChange={e => patch('buyPrice', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ราคาขาย (sellPrice)</span>
              <input type="number" value={form.sellPrice} onChange={e => patch('sellPrice', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">stackMax</span>
              <input type="number" value={form.stackMax} onChange={e => patch('stackMax', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">iconIndex</span>
              <input type="number" value={form.iconIndex} onChange={e => patch('iconIndex', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {Object.values(items).length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีไอเทม</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">ประเภท</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">buyPrice</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">sellPrice</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(items).map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{item.type}</span></td>
                  <td className="px-4 py-3 text-right text-brand-strong">{item.buyPrice}</td>
                  <td className="px-4 py-3 text-right text-accent-pink">{item.sellPrice}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEdit(item)} className="text-xs text-brand hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-rose-500 hover:underline">ลบ</button>
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
