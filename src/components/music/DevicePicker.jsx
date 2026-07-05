// src/components/music/DevicePicker.jsx
import { useState } from 'react'
import { Speaker, RefreshCw, Check } from 'lucide-react'
import { useMusicStore } from '../../stores/useMusicStore'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { getDevices, transferPlayback } from '../../services/spotifyApi'

export default function DevicePicker() {
  const devices = useMusicStore((s) => s.devices)
  const device = useMusicStore((s) => s.device)
  const [open, setOpen] = useState(false)

  const loadDevices = async () => {
    try {
      const list = await withFreshToken((t) => getDevices(t))
      useMusicStore.getState().setDevices(list)
    } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next) await loadDevices()
  }

  const choose = async (d) => {
    try {
      await withFreshToken((t) => transferPlayback(t, d.id))
      await loadDevices()
      setOpen(false)
    } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={toggle} aria-label="เลือกอุปกรณ์" className="flex items-center gap-2 text-brand thai-font text-xs">
        <Speaker size={14} />
        <span className="truncate">{device?.name ?? 'เลือกอุปกรณ์เล่นเพลง'}</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1 rounded-xl bg-brand-soft p-2">
          {devices.length === 0 && (
            <li className="thai-font text-xs text-gray-500 px-1 py-1">ไม่พบอุปกรณ์ — เปิดแอป Spotify ในเครื่องก่อน</li>
          )}
          {devices.map((d) => (
            <li key={d.id}>
              <button onClick={() => choose(d)} className="w-full flex items-center gap-2 py-1.5 px-1 text-left">
                <Speaker size={14} className="text-brand" />
                <span className="thai-font text-sm text-ink flex-1 truncate">{d.name}</span>
                {d.isActive && <Check size={14} className="text-brand" />}
              </button>
            </li>
          ))}
          <li>
            <button onClick={loadDevices} className="w-full flex items-center gap-2 py-1.5 px-1 text-left text-brand thai-font text-xs">
              <RefreshCw size={12} /> รีเฟรชอุปกรณ์
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
