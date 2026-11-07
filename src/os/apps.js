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
//   logo         optional picture for the tile (falls back to Icon); logoFull = no padding
//   category     one of CATEGORIES (Store catalogue section)
//   intro        'goal' | 'habit' | 'community': animated scene shown before the app opens
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
    tagline: "ตั้งเป้าหมายมหาลัย คณะ สาขา และวันสอบ",
    description: "เลือกเป้าหมาย ใส่วันสอบ รอบ 3 และคะแนนที่ต้องใช้ แล้วให้ AI วางแผนอ่านหนังสือให้ทุกวัน ข้อมูลบันทึกในบัญชีของคุณ",
    Icon: Target,
    tone: 'var(--color-zone-health)',
    installable: true,
    logo: '/assets/os/apps/goal.webp',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    intro: 'goal',
    defaultInstalled: true,
    features: ["เลือกมหาวิทยาลัย คณะ และสาขาเป้าหมาย","ตั้งวันสอบและนับถอยหลัง","ลิสต์คะแนนที่ต้องใช้ เทียบกับคะแนนของคุณ","กด \"วางแผนด้วย AI\" ได้แผนอ่านหนังสือรายวันถึงวันสอบ","บันทึกในบัญชีอัตโนมัติ เชื่อมกับ Habit"],
    load: () => import('./apps/GoalApp'),
  },
  {
    id: 'habit',
    name: 'Habit',
    tagline: "ปฏิทิน แผนรายวัน และ to do list",
    description: "ศูนย์กลางแผนอ่านหนังสือ ดูแผนแต่ละวันบนปฏิทิน เลื่อนการ์ดดูวันที่เหลือ เวลาอ่านหนังสือ และเปอร์เซ็นต์ที่ทำตามแผนได้",
    Icon: CalendarCheck,
    tone: 'var(--color-zone-earth)',
    installable: true,
    logo: '/assets/os/apps/habit.webp',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    intro: 'habit',
    defaultInstalled: true,
    features: ["ปฏิทินรายเดือน กดดูแผนแต่ละวัน","การ์ดเลื่อนได้: นับถอยหลัง เวลาอ่าน % ทำตามแผน กลยุทธ์จากพี่","แผนวันนี้/พรุ่งนี้ พร้อมแท็ก TGAT / A-Level","to do list ของตัวเอง","นิสัยประจำวันพร้อมสถิติต่อเนื่อง"],
    load: () => import('./apps/HabitApp'),
  },
  {
    id: 'reading',
    name: 'Reading',
    tagline: "ห้องอ่านหนังสือ จับเวลา และอันดับ",
    description: "จับเวลาอ่านหนังสือกับอวตารของคุณ สะสมเวลาเข้า Habit และแข่งอันดับกับเพื่อนคณะ/สาขาเดียวกัน หรือดูสถิติเดี่ยวของตัวเอง",
    Icon: BookOpen,
    tone: 'var(--color-zone-sci)',
    installable: true,
    logo: '/assets/os/apps/reading.webp',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ["จับเวลาอ่าน 25 / 45 / 60 นาที","เวลาที่อ่านไปเชื่อมกับการ์ดใน Habit","อันดับเดี่ยว (สถิติของคุณ) และกลุ่ม (คณะ/สาขาเดียวกัน)","แชร์ผลวันนี้ไปที่ห้องแชตใน Community","ติดตามหน้าที่อ่านถึงของแต่ละเล่ม"],
    load: () => import('./apps/ReadingApp'),
  },
  {
    id: 'community',
    name: 'Community',
    tagline: "คุยกับเพื่อนคณะ/สาขาเดียวกัน",
    description: "ห้องแชตของคนที่เลือกคณะและสาขาเดียวกัน แม้อยู่คนละมหาวิทยาลัย มีห้องรวมสำหรับทุกคน และค้นหาเพื่อนเพื่อติดตาม",
    Icon: Users,
    tone: 'var(--color-zone-arts)',
    installable: true,
    logo: '/assets/os/apps/community.webp',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    intro: 'community',
    defaultInstalled: true,
    features: ["ห้องแชตตามคณะ/สาขาที่ตั้งไว้ใน Goal","ห้องรวมสำหรับทุกคน","ค้นหาเพื่อนจากชื่อหรือโรงเรียน ส่งคำขอติดตาม","ลบข้อความของตัวเองได้"],
    load: () => import('./apps/CommunityApp'),
  },
  {
    id: 'secretary',
    name: 'Secretary',
    tagline: "เลขา AI พี่ใจดี ตามงานให้",
    description: "เลขา AI ที่รู้แผนของคุณ ช่วยตามงานที่ยังไม่ทำ ให้กำลังใจ ตอบคำถามแบบพิมพ์ และโทรคุยได้",
    Icon: Bot,
    tone: 'var(--color-brand)',
    installable: true,
    logo: '/assets/os/apps/secretary.webp',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ["สรุปงานวันนี้ที่ยังไม่ทำ ติ๊กเสร็จได้ทันที","พิมพ์คุยกับพี่ใจดี พี่รู้เป้าหมายและแผนของคุณ","โทรคุยด้วยเสียง (ต้องยินยอม มีโควตาต่อวัน)"],
    load: () => import('./apps/SecretaryApp'),
  },
  ...STORE_LINKS.map((l) => ({
    id: l.id,
    name: l.name,
    tagline: l.tagline,
    description: `เว็บไซต์ ${l.url} เปิดดูในหน้าต่างของ I LOVE TCAS (บางเว็บไม่อนุญาตให้ฝัง จะเปิดในแท็บใหม่แทน)`,
    Icon: l.Icon,
    tone: l.tone,
    logo: l.logo,
    logoFull: true,
    category: l.category,
    embed: l.embed !== false,
    url: l.url,
    features: ['เปิดเว็บไซต์จริงในหน้าต่างของเรา', l.tagline],
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

// Store catalogue sections, in display order.
export const CATEGORIES = [
  { id: 'study', label: 'เครื่องมือเตรียมสอบ' },
  { id: 'admission', label: 'สมัครและข้อมูลรับเข้า' },
  { id: 'learn', label: 'เรียนและติว' },
  { id: 'activity', label: 'ค่ายและกิจกรรม' },
  { id: 'news', label: 'ชุมชนและข่าวสาร' },
]

export function searchStoreApps(query, apps = OS_APPS, category = 'all') {
  const q = query.trim().toLowerCase()
  return apps.filter(
    (a) =>
      a.installable &&
      (category === 'all' || a.category === category) &&
      (!q || a.name.toLowerCase().includes(q) || (a.tagline ?? '').toLowerCase().includes(q)),
  )
}

// [{ id, label, apps }] in CATEGORIES order; empty sections are dropped, uncategorised apps go last.
export function groupByCategory(apps) {
  const groups = CATEGORIES.map((c) => ({ ...c, apps: apps.filter((a) => a.category === c.id) }))
  const known = new Set(CATEGORIES.map((c) => c.id))
  const rest = apps.filter((a) => !known.has(a.category))
  if (rest.length) groups.push({ id: 'other', label: 'อื่นๆ', apps: rest })
  return groups.filter((g) => g.apps.length > 0)
}
