import Popup from './ui/Popup'
import { useGuestMergeStore } from '../stores/useGuestMergeStore'

export default function GuestMergeDialog() {
  const pendingConflict = useGuestMergeStore((s) => s.pendingConflict)
  const mergeGuestAppend = useGuestMergeStore((s) => s.mergeGuestAppend)
  const discardGuest = useGuestMergeStore((s) => s.discardGuest)

  if (!pendingConflict) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <Popup variant="center" size="sm" onClose={() => {}} backdrop>
        <div className="p-6 text-center">
          <p className="pixel-font text-xs text-ink mb-3">พบงานที่ทำไว้ก่อน login</p>
          <p className="thai-font text-sm text-ink/70 mb-6">
            บัญชีของคุณมีข้อมูลอยู่แล้ว ต้องการเก็บงาน guest ไว้หรือทิ้ง?
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={mergeGuestAppend}
              className="px-btn w-full rounded-xl bg-brand-strong py-3 thai-font text-sm text-white"
            >
              เก็บงานใหม่เพิ่มเข้าไป
            </button>
            <button
              type="button"
              onClick={discardGuest}
              className="px-btn w-full rounded-xl bg-paper py-3 thai-font text-sm text-ink"
            >
              ทิ้งงาน guest
            </button>
          </div>
        </div>
      </Popup>
    </div>
  )
}
