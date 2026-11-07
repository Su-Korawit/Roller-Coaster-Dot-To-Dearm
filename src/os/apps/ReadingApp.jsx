import { useAuthStore } from '../../stores/useAuthStore'

// Reading: opening it drops you straight into the study room game (/home: your room, focus timer,
// trees, shop, decorating) inside the OS window. It is a same-origin frame, so the game's own stores
// stay separate from the OS. Nothing else on top: the window frame is the only OS chrome.
export default function ReadingApp() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <p className="thai-font text-sm text-ink-soft p-6">เข้าสู่ระบบเพื่อเข้าห้องอ่านหนังสือ</p>
  return <iframe src="/home" title="ห้องอ่านหนังสือ" allow="fullscreen" className="w-full h-full border-0 bg-mist block" />
}
