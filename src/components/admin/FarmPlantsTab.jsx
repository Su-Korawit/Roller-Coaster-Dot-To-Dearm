// src/components/admin/FarmPlantsTab.jsx
import { useState, useEffect } from 'react'
import { setDoc, deleteDoc } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase'
import { refs } from '../../lib/db'
import { useFarmDataStore } from '../../stores/useFarmDataStore'
import { useToast } from './Toast'

const SHEET_COLS = 6
const SHEET_ROWS = 2
const FRAME_PX = 16
const SCALE = 4          // 16px → 64px display
const TOTAL_FRAMES = SHEET_COLS * SHEET_ROWS  // 12

const STAGE_LABELS = ['Stage 0 (สด)', 'Stage 1', 'Stage 2', 'Stage 3 (พร้อมเก็บ)']

function FramePicker({ frameIndex, onChange, imgUrl }) {
  if (!imgUrl) return <div className="text-xs text-gray-400 py-4">กำลังโหลด sprite sheet...</div>
  return (
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
              border: selected ? '3px solid #7c3aed' : '3px solid transparent',
              borderRadius: 4,
            }}
          />
        )
      })}
    </div>
  )
}

const EMPTY_PLANT = {
  id: '', name: '', seedKey: '', stages: 4,
  growTime: [15, 30, 60],
  size: { w: 1, h: 1 },
  yieldMin: 1, yieldMax: 3,
  spriteFrames: [0, 1, 2, 3],
}

export default function FarmPlantsTab() {
  const plants = useFarmDataStore((s) => s.plants)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_PLANT)
  const [saving, setSaving] = useState(false)
  const [imgUrl, setImgUrl] = useState(null)
  const [activeStage, setActiveStage] = useState(0) // which stage frame is being picked
  const toast = useToast()

  useEffect(() => {
    getDownloadURL(ref(storage, 'rc/objects/Basic_Plants.png'))
      .then(setImgUrl)
      .catch(() => setImgUrl('/assets/sprites/Objects/Basic_Plants.png'))
  }, [])

  const openNew = () => { setForm(EMPTY_PLANT); setEditing('new'); setActiveStage(0) }
  const openEdit = (plant) => {
    setForm({
      ...plant,
      growTime: plant.growTime ?? [15, 30, 60],
      spriteFrames: plant.spriteFrames ?? [0, 1, 2, 3],
    })
    setEditing(plant.id)
    setActiveStage(0)
  }
  const close = () => { setEditing(null); setForm(EMPTY_PLANT) }
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const patchGrowTime = (i, v) => {
    const next = [...form.growTime]
    next[i] = Number(v)
    patch('growTime', next)
  }

  const patchSpriteFrame = (stage, frameIndex) => {
    const next = [...form.spriteFrames]
    next[stage] = frameIndex
    patch('spriteFrames', next)
  }

  const handleSave = async () => {
    const id = editing === 'new' ? form.id.trim() : editing
    if (!id) { toast?.error('กรุณาใส่ Plant ID'); return }
    if (!form.name.trim()) { toast?.error('กรุณาใส่ชื่อพืช'); return }
    const payload = {
      id,
      name: form.name.trim(),
      seedKey: form.seedKey.trim(),
      stages: 4,
      growTime: form.growTime.map(Number),
      size: { w: Number(form.size.w) || 1, h: Number(form.size.h) || 1 },
      yieldMin: Number(form.yieldMin),
      yieldMax: Number(form.yieldMax),
      spriteFrames: form.spriteFrames.map(Number),
    }
    setSaving(true)
    try {
      await setDoc(refs.farmPlant(id), payload)
      useFarmDataStore.getState().setPlants({ ...useFarmDataStore.getState().plants, [id]: payload })
      toast?.success('บันทึกแล้ว')
      close()
    } catch (e) {
      toast?.error('บันทึกไม่สำเร็จ: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plantId) => {
    if (!window.confirm(`ลบพืช "${plantId}"?`)) return
    try {
      await deleteDoc(refs.farmPlant(plantId))
      const next = { ...useFarmDataStore.getState().plants }
      delete next[plantId]
      useFarmDataStore.getState().setPlants(next)
      toast?.success('ลบแล้ว')
      if (editing === plantId) close()
    } catch (e) {
      toast?.error('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{Object.keys(plants).length} พืช</p>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90">+ พืชใหม่</button>
      </div>

      {editing && (
        <div className="rounded-2xl border-2 border-brand/30 bg-white p-5 shadow-sm space-y-5">
          <p className="font-semibold text-gray-800">{editing === 'new' ? '➕ พืชใหม่' : `✏️ แก้ไข ${editing}`}</p>
          <div className="grid grid-cols-2 gap-4">
            {editing === 'new' && (
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-gray-500">Plant ID</span>
                <input value={form.id} onChange={e => patch('id', e.target.value)} placeholder="เช่น turnip" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">ชื่อ</span>
              <input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="เช่น หัวผักกาด" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Seed Item ID</span>
              <input value={form.seedKey} onChange={e => patch('seedKey', e.target.value)} placeholder="เช่น turnip_seed" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none font-mono" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Yield Min</span>
              <input type="number" value={form.yieldMin} onChange={e => patch('yieldMin', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Yield Max</span>
              <input type="number" value={form.yieldMax} onChange={e => patch('yieldMax', e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Size W (tiles)</span>
              <input type="number" min={1} value={form.size.w} onChange={e => patch('size', { ...form.size, w: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Size H (tiles)</span>
              <input type="number" min={1} value={form.size.h} onChange={e => patch('size', { ...form.size, h: e.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </label>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold mb-2">Grow Time (seconds ต่อ stage)</p>
            <div className="flex gap-2">
              {form.growTime.map((t, i) => (
                <label key={i} className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">stage {i}→{i+1}</span>
                  <input type="number" value={t} onChange={e => patchGrowTime(i, e.target.value)} className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none" />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold mb-2">Sprite Frames — คลิกเลือก frame สำหรับแต่ละ stage</p>
            <div className="flex gap-2 mb-3">
              {STAGE_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStage(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    activeStage === i ? 'border-brand bg-brand/10 text-brand' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {label} → frame {form.spriteFrames[i] ?? '?'}
                </button>
              ))}
            </div>
            <FramePicker
              frameIndex={form.spriteFrames[activeStage]}
              onChange={(idx) => { patchSpriteFrame(activeStage, idx); if (activeStage < 3) setActiveStage(s => s + 1) }}
              imgUrl={imgUrl}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={close} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-60">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {Object.values(plants).length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">ยังไม่มีพืช</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">ขนาด</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Yield</th>
                <th className="px-4 py-3 text-center text-xs text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.values(plants).map(plant => (
                <tr key={plant.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{plant.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{plant.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{plant.size?.w}×{plant.size?.h}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{plant.yieldMin}–{plant.yieldMax}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEdit(plant)} className="text-xs text-brand hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(plant.id)} className="text-xs text-rose-500 hover:underline">ลบ</button>
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
