import { lazy } from 'react'
import { ShoppingBag, Target, CalendarCheck, BookOpen, Users, Bot } from 'lucide-react'
import { STORE_LINKS } from './storeLinks'

// The OS app registry — the one place to add an app to the OS.
//   id           unique, kebab-case
//   name         label under the icon
//   tagline      one line, shown in the Store and the details sheet
//   description  longer text for the details sheet
//   Icon         lucide-react component for the tile
//   tone         CSS colour for the tile (use design tokens)
//   builtIn      always on the Home screen, cannot be removed
//   installable  listed in the Store; the user adds/removes it
//   logo         optional picture for the tile (falls back to Icon)
//   features     bullet list for the Store detail page
//   defaultInstalled  put on every device's Home once, the user may remove it
//   load         () => import('./apps/XxxApp') — default export is the app's React component,
//                rendered inside the app window with `{ onOpenApp }` props
const RAW_APPS = [
  {
    id: 'store',
    name: 'Store',
    tagline: 'ร้านแอปของ I LOVE TCAS',
    description: 'ค้นหาและติดตั้งแอปเพิ่มลงในเครื่องของคุณ',
    Icon: ShoppingBag,
    tone: 'var(--color-zone-biz)',
    builtIn: true,
    installable: false,
    load: () => import('./apps/StoreApp'),
  },
  {
    id: 'goal',
    name: 'Goal',
    tagline: 'ตั้งเป้าหมายมหาลัย คณะ สาขา',
    description: 'เลือกเป้าหมาย แล้วจดคะแนนที่ต้องใช้เทียบกับคะแนนของคุณ',
    Icon: Target,
    tone: 'var(--color-zone-health)',
    installable: true,
    logo: '/assets/os/apps/goal.webp',   // from ChatGPT (ai-handoff 007); falls back to Icon until added
    defaultInstalled: true,
    features: ["เลือกมหาวิทยาลัย คณะ และสาขาเป้าหมาย", "ยังไม่มีคณะ? จดสิ่งที่สนใจไว้ก่อน", "ลิสต์คะแนนที่ต้องใช้ในแต่ละวิชา", "เทียบกับคะแนนของคุณ ดูว่าขาดอีกเท่าไร"],
    load: () => import('./apps/GoalApp'),
  },
  {
    id: 'habit',
    name: 'Habit',
    tagline: 'แผนวันนี้และนิสัยประจำวัน',
    description: 'เช็กลิสต์แผนวันนี้ (TGAT / A-Level) พร้อมสถิติต่อเนื่องของนิสัย',
    Icon: CalendarCheck,
    tone: 'var(--color-zone-earth)',
    installable: true,
    logo: '/assets/os/apps/habit.webp',   // from ChatGPT (ai-handoff 007); falls back to Icon until added
    defaultInstalled: true,
    features: ["แผนวันนี้แบบเช็กลิสต์ แยกแท็ก TGAT / A-Level", "แถบความคืบหน้าเป็นเปอร์เซ็นต์", "สร้างนิสัยประจำวัน", "นับวันที่ทำต่อเนื่องติดกัน"],
    load: () => import('./apps/HabitApp'),
  },
  {
    id: 'reading',
    name: 'Reading',
    tagline: 'ติดตามการอ่านหนังสือ',
    description: 'จดหนังสือที่กำลังอ่านและดูความคืบหน้าเป็นเปอร์เซ็นต์',
    Icon: BookOpen,
    tone: 'var(--color-zone-sci)',
    installable: true,
    logo: '/assets/os/apps/reading.webp',   // from ChatGPT (ai-handoff 007); falls back to Icon until added
    defaultInstalled: true,
    features: ["จดหนังสือและชีทที่กำลังอ่าน", "บันทึกหน้าที่อ่านถึง", "ดูความคืบหน้าเป็นเปอร์เซ็นต์"],
    load: () => import('./apps/ReadingApp'),
  },
  {
    id: 'community',
    name: 'Community',
    tagline: 'หาเพื่อนที่สนใจเหมือนกัน',
    description: 'ค้นหาเพื่อนจากชื่อหรือโรงเรียน แล้วส่งคำขอติดตาม',
    Icon: Users,
    tone: 'var(--color-zone-arts)',
    installable: true,
    logo: '/assets/os/apps/community.webp',   // from ChatGPT (ai-handoff 007); falls back to Icon until added
    defaultInstalled: true,
    features: ["ค้นหาเพื่อนจากชื่อหรือโรงเรียน", "ส่งคำขอติดตาม", "แสดงเป้าหมายคณะ/สาขาของคุณเพื่อหาคนที่สนใจเหมือนกัน"],
    load: () => import('./apps/CommunityApp'),
  },
  {
    id: 'secretary',
    name: 'Secretary',
    tagline: 'คุยกับ AI พี่ใจดี',
    description: 'โทรคุยกับเลขา AI พี่ใจดี ให้ช่วยวางแผนและให้กำลังใจ',
    Icon: Bot,
    tone: 'var(--color-brand)',
    installable: true,
    logo: '/assets/os/apps/secretary.webp',   // from ChatGPT (ai-handoff 007); falls back to Icon until added
    defaultInstalled: true,
    features: ["โทรคุยกับเลขา AI พี่ใจดี", "ช่วยวางแผนการอ่านหนังสือ", "ให้กำลังใจเวลาท้อ", "ต้องยินยอมก่อนโทร มีโควตาต่อวัน"],
    load: () => import('./apps/HelpApp'),
  },
  ...STORE_LINKS.map((l) => ({
    id: l.id,
    name: l.name,
    tagline: l.tagline,
    description: `เว็บไซต์ ${l.url} (เปิดในแท็บใหม่)`,
    Icon: l.Icon,
    tone: l.tone,
    logo: l.logo,
    url: l.url,
    features: ['เปิดเว็บไซต์จริงในแท็บใหม่', l.tagline],
    installable: true,
    load: () => import('./apps/LinkApp'),
  })),
]

// Lazy component per app, created once at module load so React keeps one type per app.
const withComponent = (app) => ({ ...app, Component: lazy(app.load) })

export const OS_APPS = RAW_APPS.map(withComponent)

// The floating help button is hidden for now; flip this to bring it back on the Home screen.
export const HELP_BUTTON_ENABLED = false

// The floating help button ("พี่ช่วยเหลือ"). Not a grid app.
export const HELP_APP = withComponent({
  id: 'help',
  name: 'พี่ช่วยเหลือ',
  tagline: 'เลขา AI พี่ใจดี',
  description: 'ให้พี่ใจดีช่วยวางแผนและเตือนการอ่านหนังสือ',
  load: () => import('./apps/HelpApp'),
})

export const DEFAULT_INSTALLED = OS_APPS.filter((a) => a.defaultInstalled).map((a) => a.id)

export function findApp(id, apps = OS_APPS) {
  return apps.find((a) => a.id === id) ?? null
}

// Home order: built-in apps first, then the user's installed ones. Repairs on read — unknown,
// duplicate or no-longer-installable ids in the persisted list are dropped.
export function homeAppIds(installed = [], apps = OS_APPS) {
  const builtIns = apps.filter((a) => a.builtIn).map((a) => a.id)
  const extra = []
  for (const id of installed) {
    const app = findApp(id, apps)
    if (app && app.installable && !app.builtIn && !extra.includes(id)) extra.push(id)
  }
  return [...builtIns, ...extra]
}

export function paginate(items, perPage) {
  const size = Math.max(1, perPage | 0)
  const pages = []
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size))
  return pages.length ? pages : [[]]
}

export function searchStoreApps(query, apps = OS_APPS) {
  const q = query.trim().toLowerCase()
  return apps.filter(
    (a) => a.installable && (!q || a.name.toLowerCase().includes(q) || (a.tagline ?? '').toLowerCase().includes(q)),
  )
}
