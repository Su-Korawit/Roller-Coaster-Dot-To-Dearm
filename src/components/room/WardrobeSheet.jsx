import { useState } from 'react'
import Popup from '../ui/Popup'
import { useRoomStore } from '../../stores/useRoomStore'
import { useLeavesStore } from '../../stores/useLeavesStore'
import { useFxStore } from '../../stores/useFxStore'
import { useRoomUiStore } from '../../stores/useRoomUiStore'
import { saveAvatar } from '../../services/roomApi'
import { AVATAR_SLOTS } from '../../room/avatar'
import { AVATAR_SAVE_FAILED } from '../../room/messages'

const SLOT_LABEL = { head: 'หัว', face: 'ใบหน้า', neck: 'คอ', back: 'หลัง' }

// Dress up: one row per slot with the accessories the student owns, and an outfit hue. Every change is
// saved through the saveAvatar callable (the server checks ownership); the avatar shown is whatever the
// server accepted, so a refusal never leaves the screen out of step with the account.
export default function WardrobeSheet({ onClose }) {
  const catalog = useRoomStore((s) => s.catalog)
  const inventory = useLeavesStore((s) => s.inventory)
  const avatar = useLeavesStore((s) => s.avatar)
  const [hue, setHue] = useState(avatar.outfitHue ?? 0)
  const [busy, setBusy] = useState(false)

  const owned = Object.entries(catalog).filter(([id, item]) => item.kind === 'accessory' && Number(inventory[id] ?? 0) > 0)

  const save = async (next) => {
    setBusy(true)
    try {
      await saveAvatar(next)
      useLeavesStore.getState().applyServer({ avatar: next })
    } catch {
      useFxStore.getState().push({ kind: 'info', text: AVATAR_SAVE_FAILED })
    } finally {
      setBusy(false)
    }
  }

  const wear = (slot, id) => {
    const accessories = { ...avatar.accessories }
    if (id) accessories[slot] = id
    else delete accessories[slot]
    return save({ accessories, outfitHue: avatar.outfitHue })
  }

  return (
    <Popup variant="sheet" size="md" onClose={onClose}>
      <div className="p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <h2 className="pixel-font text-lg text-ink">ตู้เสื้อผ้า</h2>

        {owned.length === 0 && (
          <div className="px-slab p-3 flex flex-col gap-2">
            <p className="thai-font text-sm text-ink">ยังไม่มีเครื่องประดับ ซื้อได้ที่ร้านค้า แท็บตัวละคร</p>
            <button type="button" className="px-btn h-11 text-sm font-bold bg-leaf text-ink" onClick={() => useRoomUiStore.getState().open('shop')}>
              ไปร้านค้า
            </button>
          </div>
        )}

        {AVATAR_SLOTS.map((slot) => {
          const options = owned.filter(([, item]) => item.slot === slot)
          return (
            <div key={slot} role="group" aria-label={SLOT_LABEL[slot]} className="flex flex-col gap-2">
              <h3 className="thai-font text-sm font-bold text-ink">{SLOT_LABEL[slot]}</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label="ไม่ใส่"
                  aria-pressed={!avatar.accessories[slot]}
                  disabled={busy}
                  onClick={() => wear(slot, null)}
                  className={`px-btn h-11 px-3 text-sm font-bold ${!avatar.accessories[slot] ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
                >
                  ไม่ใส่
                </button>
                {options.map(([id, item]) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={item.name}
                    aria-pressed={avatar.accessories[slot] === id}
                    disabled={busy}
                    onClick={() => wear(slot, id)}
                    className={`px-btn h-11 px-3 text-sm font-bold ${avatar.accessories[slot] === id ? 'bg-ink text-white' : 'bg-paper text-ink'}`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="flex flex-col gap-2">
          <label htmlFor="outfit-hue" className="thai-font text-sm font-bold text-ink">สีเสื้อผ้า</label>
          <input
            id="outfit-hue"
            type="range"
            min={0}
            max={359}
            step={1}
            value={hue}
            aria-label="สีเสื้อผ้า"
            onChange={(e) => setHue(Number(e.target.value))}
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} className="px-btn h-11 px-3 text-sm font-bold bg-leaf text-ink flex-1" onClick={() => save({ accessories: avatar.accessories, outfitHue: Math.round(hue) })}>
              บันทึกสี
            </button>
            <button type="button" disabled={busy} className="px-btn h-11 px-3 text-sm font-bold bg-paper text-ink" onClick={() => { setHue(0); save({ accessories: avatar.accessories, outfitHue: null }) }}>
              สีเดิม
            </button>
          </div>
        </div>
      </div>
    </Popup>
  )
}
