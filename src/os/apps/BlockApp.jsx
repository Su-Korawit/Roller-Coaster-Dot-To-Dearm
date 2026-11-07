import { useAuthStore } from '../../stores/useAuthStore'

// Block: the original Roadmap — blocks you connect into a path to your goal (career, university, skills).
// It opens the real /roadmap page inside the window (a same-origin frame), so the roadmap editor, its
// StartNode and its saving behave exactly as before and are not touched by the OS.
export default function BlockApp() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <p className="thai-font text-sm text-ink-soft p-6">เข้าสู่ระบบเพื่อใช้ Block</p>
  return <iframe src="/roadmap" title="Block" allow="fullscreen" className="w-full h-full border-0 bg-mist block" />
}
