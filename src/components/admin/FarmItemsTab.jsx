// src/components/admin/FarmItemsTab.jsx
import { useState, useEffect } from 'react'
import { setDoc, deleteDoc } from 'firebase/firestore'
import { refs } from '../../lib/db'
import { cloudAsset } from '../../utils/cloudAsset'
import { useFarmDataStore } from '../../stores/useFarmDataStore'
import { useToast } from './Toast'

const ITEM_TYPES = ['seed', 'produce']
const EMPTY = { id: '', name: '', type: 'seed', plantId: '', buyPrice: 0, sellPrice: 0, stackMax: 99, iconIndex: 0 }

const SHEET_COLS = 6
const SHEET_ROWS = 2
const FRAME_PX = 16
const SCALE = 4
const TOTAL_FRAMES = SHEET_COLS * SHEET_ROWS

function FramePicker({ frameIndex, onChange, imgUrl }) {
  if (!imgUrl) return <div className="text-xs text-gray-400 py-2">กำลังโหลด sprite sheet...</div>
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">Seeds อยู่ใน Column แรก (frame 0 และ 6)</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SHEET_COLS}, ${FRAME_PX * SCALE}px)`, gap: 2 }}>
        {Array.from({ length: TOTAL_FRAMES }, (_, i) => {
          const col = i % SHEET_COLS
          const row = Math.floor(i / SHEET_COLS)
          const selected = frameIndex === i
          return (
            <div
              key={i}
              onClick={() => onChange(i)}
              title={`Frame ${i}`}
              style={{
                width: FRAME_PX * SCALE,
                height: FRAME_PX * SCALE,
                backgroundImage: `url(${imgUrl})`,
                backgroundPosition: `-${col * FRAME_PX * SCALE}px -${row * FRAME_PX * SCALE}px`,
                backgroundSize: `${SHEET_COLS * FRAME_PX * SCALE}px ${SHEET_ROWS * FRAME_PX * SCALE}px`,
                imageRendering: 'pixelated',
                cursor: 'pointer',
                border: selected ? '3px solid #7c3aed' : col === 0 ? '3px solid #86efac' : '3px solid transparent',
                borderRadius: 4,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function FarmItemsTab() {
  const items = useFarmDataStore((s) => s.items)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [imgUrl, setImgUrl] = useState(null)
  const toast = useToast()

  useEffect(() => {
    cloudAsset('rc/objects/Basic_Plants.png', { fallback: '/assets/sprites/Objects/Basic_Plants.png' }).then(setImgUrl)
  }, [])

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
      await setDoc(refs.farmItem(id), payload)
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
      await deleteDoc(refs.farmItem(itemId))
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
        <div className="neo-card p-5 space-y-4 border-brand">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ ไอเทมใหม่' : `✏️ แก้ไข ${editing}`}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editing === 'new' && (
              <label className="flex flex-col gap-1 col-span-full">
                <span className="text-xs text-gray-500">Item ID</span>
                <input value={form.id} onChange={e => patch('id', e.target.value)} placeholder="เช่น turnip_seed" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
              </label>
            )}
            <label className="flex flex-col gap-1 col-span-full">
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
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">iconIndex (Basic_Plants.png)</span>
              <span className="text-xs font-mono text-brand">frame {form.iconIndex}</span>
            </div>
            <FramePicker
              frameIndex={Number(form.iconIndex)}
              onChange={(i) => patch('iconIndex', i)}
              imgUrl={imgUrl}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </div>
      )}

      <div className="neo-card overflow-x-auto">
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
