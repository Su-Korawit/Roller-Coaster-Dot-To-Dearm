import { Check } from 'lucide-react'
import OsSheet from './OsSheet'
import { AVATARS, avatarSrc } from './avatars'
import { useOsStore } from '../stores/useOsStore'

// Pick a profile picture. One flat grid (no gender groups). Stored on this device only, per user.
export default function AvatarSheet({ user, onClose }) {
  const current = useOsStore((s) => s.avatars[user.uid])
  const setAvatar = useOsStore((s) => s.setAvatar)

  return (
    <OsSheet title="เลือกรูปโปรไฟล์" onClose={onClose}>
      <div className="max-h-[60vh] overflow-y-auto p-1" role="radiogroup" aria-label="รูปโปรไฟล์">
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map((a) => {
            const on = current === a.id
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={a.name}
                onClick={() => setAvatar(user.uid, a.id)}
                className={`relative aspect-square rounded-full p-0.5 border-2 transition-transform active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                  ${on ? 'border-brand-strong shadow-px-sm' : 'border-transparent hover:border-hairline'}`}
              >
                <img src={avatarSrc(a.id)} alt="" draggable={false} loading="lazy" className="w-full h-full rounded-full" style={{ imageRendering: 'pixelated' }} />
                {on && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-brand-strong text-white flex items-center justify-center">
                    <Check size={14} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={() => setAvatar(user.uid, null)}
          disabled={!current}
          className="px-btn px-3 py-2 thai-font text-xs font-bold bg-paper disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ใช้รูป Google / ตัวอักษร
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-btn flex-1 py-2 thai-font text-sm font-bold bg-brand-strong text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          เสร็จ
        </button>
      </div>
    </OsSheet>
  )
}
