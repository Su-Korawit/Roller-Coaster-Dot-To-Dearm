import { lazy } from 'react'
import { ShoppingBag, Target, CalendarCheck, CalendarDays, BookOpen, Users, Bot, Landmark, MessageSquarePlus, Settings, School, MessagesSquare, SmilePlus, Blocks, ListChecks } from 'lucide-react'
import { STORE_LINKS } from './storeLinks'
import { UNIVERSITY_ROWS, NO_EMBED_IDS, shortUniName } from '../data/universityApps'

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
//   splash       optional launch-screen art (shown while the window opens, see splash/AppSplash.jsx)
//   features     bullet list for the Store detail page
//   defaultInstalled  put on every device's Home once, the user may remove it
//   load         () => import('./apps/XxxApp') — default export is the app's React component,
//                rendered inside the app window with `{ onOpenApp }` props
const RAW_APPS = [
  {
    id: 'store',
    splash: '/assets/os/splash/store.webp',
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
    id: 'settings',
    name: 'Settings',
    tagline: 'ตั้งค่าบัญชี หน้าจอ เสียง และความปลอดภัย',
    description: 'จัดการโปรไฟล์ วอลเปเปอร์ เสียง ภาษา AI รหัสผ่านเครื่องนี้ และความเป็นส่วนตัว แยกเป็นหมวดให้หาง่าย',
    Icon: Settings,
    tone: 'var(--color-ink-soft)',
    builtIn: true,
    installable: false,
    logo: '/assets/os/apps/settings.webp',
    logoFull: true,
    load: () => import('./apps/SettingsApp'),
  },
  {
    id: 'goal',
    name: 'Goal',
    tagline: "ตั้งเป้าหมายมหาลัย คณะ สาขา และวันสอบ",
    description: "เลือกเป้าหมาย ใส่วันสอบ รอบ 3 และคะแนนที่ต้องใช้ แล้วให้ AI วางแผนอ่านหนังสือให้ทุกวัน ข้อมูลบันทึกในบัญชีของคุณ",
    Icon: Target,
    tone: 'var(--color-zone-health)',
    installable: true,
    logo: '/assets/os/apps/goal.webp?v=2',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    splash: '/assets/os/splash/goal.webp',
    defaultInstalled: true,
    features: ["เลือกมหาวิทยาลัย คณะ และสาขาเป้าหมาย","ตั้งวันสอบและนับถอยหลัง","คะแนนที่ต้องใช้ดึงจากฐานข้อมูลและล็อกไว้ดูอย่างเดียว พร้อมแถบความพร้อมรายวิชาในหน้าเดียวกัน","กด \"วางแผนด้วย AI\" ได้แผนอ่านหนังสือรายวันถึงวันสอบ","บันทึกในบัญชีอัตโนมัติ เชื่อมกับ Habit"],
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
    logo: '/assets/os/apps/habit.webp?v=2',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    splash: '/assets/os/splash/habit.webp',
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
    splash: '/assets/os/splash/reading.webp',
    logo: '/assets/os/apps/reading.webp?v=2',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ["จับเวลาอ่าน 25 / 45 / 60 นาที","เวลาที่อ่านไปเชื่อมกับการ์ดใน Habit","อันดับเดี่ยว (สถิติของคุณ) และกลุ่ม (คณะ/สาขาเดียวกัน)","แชร์ผลวันนี้ไปที่ห้องแชตใน Community","ติดตามหน้าที่อ่านถึงของแต่ละเล่ม"],
    load: () => import('./apps/ReadingApp'),
  },
  {
    id: 'community',
    name: 'Community',
    tagline: "ฟีดและโปรไฟล์ของคนเตรียมสอบ",
    description: "แอปโซเชียลของคนเตรียมสอบ เปิดมาเจอฟีดโพสต์ เขียนโพสต์ของตัวเอง กดถูกใจ ค้นหา และดูโปรไฟล์ของแต่ละคน ส่วนห้องแชตอยู่ในแอป Chat",
    Icon: Users,
    tone: 'var(--color-zone-arts)',
    installable: true,
    logo: '/assets/os/apps/community.webp?v=2',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    splash: '/assets/os/splash/community.webp',
    defaultInstalled: true,
    features: ["หน้าแรกเป็นฟีด จัดลำดับตามความนิยมและความใหม่","เขียนโพสต์ (ข้อความ และลิงก์รูป)","กดถูกใจ ค้นหาโพสต์ กรองข้อความ/สื่อ","หน้าโปรไฟล์ของแต่ละคน","ปุ่มลัดไปแอป Chat"],
    load: () => import('./apps/CommunityApp'),
  },
  {
    id: 'chat',
    name: 'Chat',
    tagline: "แชตห้องคณะ ห้องรวม และหาเพื่อน",
    description: "ห้องแชตของคนที่เลือกคณะและสาขาเดียวกัน แม้อยู่คนละมหาวิทยาลัย มีห้องรวมสำหรับทุกคน และค้นหาเพื่อนเพื่อติดตาม",
    Icon: MessagesSquare,
    tone: 'var(--color-zone-sci)',
    installable: true,
    splash: '/assets/os/splash/chat.webp',
    logo: '/assets/os/apps/chat.webp',
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ["ห้องแชตตามคณะ/สาขาที่ตั้งไว้ใน Goal","ห้องรวมสำหรับทุกคน","ค้นหาเพื่อนจากชื่อหรือโรงเรียน ส่งคำขอติดตาม","ลบข้อความของตัวเองได้"],
    load: () => import('./apps/ChatApp'),
  },
  {
    id: 'mood',
    name: 'Mood',
    tagline: 'เช็กอินความรู้สึกทุกวัน ดูความถี่แบบ GitHub',
    description: 'ทุกวันกดบอกว่ารู้สึกยังไง วันละครั้ง (เปลี่ยนได้ก่อนเที่ยงคืน) แต่ละวันกลายเป็นช่องสีบนตารางแบบ GitHub ดูได้ว่าช่วงนี้อารมณ์เป็นยังไง และเช็กอินต่อเนื่องกี่วัน',
    Icon: SmilePlus,
    tone: 'var(--color-accent-pink)',
    installable: true,
    splash: '/assets/os/splash/mood.webp',
    logo: '/assets/os/apps/mood.webp',
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ['เช็กอินความรู้สึก 5 ระดับ วันละครั้ง', 'ตารางสีแบบ GitHub 30 สัปดาห์ เห็นความถี่ของแต่ละอารมณ์', 'สรุป 30 วัน: อารมณ์เฉลี่ยและจำนวนวันของแต่ละระดับ', 'นับเช็กอินต่อเนื่อง'],
    load: () => import('./apps/MoodApp'),
  },
  {
    id: 'block',
    name: 'Block',
    tagline: 'วางแผนเส้นทางเป็นบล็อกต่อกัน',
    description: 'แผนที่เส้นทางของน้องแบบบล็อกที่ต่อกัน (Roadmap เดิม) เพิ่มบล็อกเป้าหมาย ทักษะ กิจกรรม แล้วลากเส้นเชื่อมเป็นเส้นทางไปสู่คณะหรืออาชีพที่ฝัน แชร์ลิงก์ให้คนอื่นดูได้',
    Icon: Blocks,
    tone: 'var(--color-zone-sci)',
    installable: true,
    splash: '/assets/os/splash/block.webp',
    logo: '/assets/os/apps/block.webp',
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ['ต่อบล็อกเป็นเส้นทางสู่เป้าหมาย', 'ลากเส้นเชื่อมและจัดวางได้อิสระ', 'บันทึกในบัญชีอัตโนมัติ', 'แชร์ลิงก์ให้เพื่อนหรือครูดูได้'],
    load: () => import('./apps/BlockApp'),
  },
  {
    id: 'checklist',
    name: 'Checklist',
    tagline: 'เช็กลิสต์เนื้อหา TGAT / A-Level และการสมัครรอบ 1 Portfolio / รอบ 2 Quota',
    description: 'ติ๊กเนื้อหาที่ต้องเรียนของ TGAT และ A-Level ตามโครงสร้างข้อสอบทางการ และดูโครงการรอบ 1 Portfolio กับรอบ 2 Quota ของทุกมหาวิทยาลัย พร้อมรายการเอกสาร เกณฑ์ และลิงก์ประกาศของแต่ละโครงการ เชื่อมกับเป้าหมายใน Goal ข้อมูลเตรียมไว้ล่วงหน้า เปิดเร็ว และจำที่ติ๊กไว้ในเครื่องนี้',
    Icon: ListChecks,
    tone: 'var(--color-zone-health)',
    installable: true,
    splash: '/assets/os/splash/checklist.webp',
    logo: '/assets/os/apps/checklist.webp',
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ['เนื้อหา TGAT1–3 และ A-Level 9 วิชา ตามโครงสร้างข้อสอบของ ทปอ.', 'โครงการรอบ 1 Portfolio และรอบ 2 Quota ของทุกมหาวิทยาลัยจาก MyTCAS พร้อมเกณฑ์ เอกสาร และลิงก์ประกาศ', 'เชื่อมกับ Goal: เป้าหมายของคุณแสดงโครงการที่สมัครได้ทันที', 'ขั้นตอนที่ตรวจจากประกาศทางการของมหาวิทยาลัยหลายแห่ง', 'ติ๊กแล้วจำให้ ดูเปอร์เซ็นต์ความคืบหน้าแต่ละรายการ'],
    load: () => import('./apps/ChecklistApp'),
  },
  {
    id: 'secretary',
    name: 'Secretary',
    tagline: "เลขาส่วนตัว AI พี่ใจดี ทักและจัดการงานให้",
    description: "เลขา AI ที่รู้แผนของคุณ ช่วยตามงานที่ยังไม่ทำ ให้กำลังใจ ตอบคำถามแบบพิมพ์ และโทรคุยได้",
    Icon: Bot,
    tone: 'var(--color-brand)',
    installable: true,
    splash: '/assets/os/splash/secretary.webp',
    logo: '/assets/os/apps/secretary.webp',   // pixel-art icon (full tile)
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ["หน้าแรก: พี่ทักถามก่อน (ต้องกดยืนยันก่อนทำ) จดงานให้ และดูประวัติที่พี่ทำให้","สร้างตารางอ่านหนังสือและเลื่อนงานที่ยังไม่ได้ทำ","แท็บแชทพิมพ์คุยกับพี่ใจดี พี่รู้เป้าหมายและแผนของคุณ","แท็บโทรคุยด้วยเสียง (ต้องยินยอม มีโควตาต่อวัน)"],
    load: () => import('./apps/SecretaryApp'),
  },
  {
    id: 'report',
    name: 'Report',
    tagline: 'ขอแอปหรือเว็บไซต์ที่อยากให้มีใน OS',
    description: 'บอกพี่ว่าอยากให้ I LOVE TCAS มีแอปหรือเว็บไซต์อะไรเพิ่ม ดูคำขอของคนอื่น กดโหวตให้อันที่อยากได้เหมือนกัน คำขอที่คนโหวตเยอะจะถูกทำก่อน',
    Icon: MessageSquarePlus,
    tone: 'var(--color-zone-arts)',
    installable: true,
    splash: '/assets/os/splash/report.webp',
    logo: '/assets/os/apps/report.webp',
    logoFull: true,
    category: 'os',
    defaultInstalled: true,
    features: ['ส่งคำขอแอปใหม่หรือเว็บไซต์ที่อยากให้รวมไว้ที่นี่', 'ดูคำขอของทุกคน เรียงตามคะแนนโหวต', 'กดโหวตให้คำขอที่คุณก็อยากได้', 'ดูสถานะคำขอของตัวเอง ลบได้'],
    load: () => import('./apps/ReportApp'),
  },
  {
    id: 'calendar',
    name: 'Calendar',
    tagline: 'ปฏิทิน TCAS70 รวมกับงานของคุณ',
    description: 'ดูวันสำคัญของ TCAS70 (เปิดรับสมัคร สอบ ประกาศผล) บนปฏิทินเดือนเดียวกับงานใน Habit กดเพิ่มวันสำคัญลงแผนของตัวเองได้',
    Icon: CalendarDays,
    tone: 'var(--color-accent-pink)',
    installable: true,
    splash: '/assets/os/splash/calendar.webp',
    logo: '/assets/os/apps/calendar.webp',
    logoFull: true,
    category: 'study',
    defaultInstalled: true,
    features: ['ปฏิทินรายเดือน มีจุดสีบอกวันสำคัญ TCAS และงานใน Habit', 'กดวันที่ดูรายการของวันนั้น', 'เพิ่มวันสำคัญลงแผนของฉัน (กลายเป็นงานใน Habit)', 'รายการที่กำลังจะมาถึง พร้อมลิงก์'],
    load: () => import('./apps/CalendarApp'),
  },
  {
    id: 'openhouse',
    name: 'Open House',
    tagline: 'เดินดูคณะและเส้นทางเข้าทุกมหาลัย',
    description: 'เดินสำรวจมหาวิทยาลัยจำลอง เข้าแต่ละคณะเพื่อดูสาขา เกณฑ์ และเส้นทางเข้า ไม่ต้องสมัครสมาชิกก็เล่นได้',
    Icon: School,
    tone: 'var(--color-zone-sci)',
    installable: true,
    splash: '/assets/os/splash/openhouse.webp',
    logo: '/assets/os/apps/openhouse.webp',
    logoFull: true,
    category: 'admission',
    defaultInstalled: true,
    features: ['เดินสำรวจมหาลัยจำลองด้วยตัวละครของคุณ', 'เข้าอาคารคณะดูสาขาและเส้นทางเข้า', 'ใช้ได้โดยไม่ต้องสมัครสมาชิก', 'กด "เปิดเต็มจอ" เพื่อเล่นในแท็บใหม่'],
    load: () => import('./apps/OpenHouseApp'),
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
  // One Store app per university in myTCAS: it simply opens that university's own admission website
  // (programmes and scores live in Goal). KU keeps its original "KU Admission" tile above.
  ...UNIVERSITY_ROWS.filter(([id]) => id !== '002').map(([id, full, url]) => ({
    id: `uni-${id}`,
    name: shortUniName(full),
    tagline: full,
    description: `เว็บรับสมัครทางการของ ${full} เปิดดูในหน้าต่างของ I LOVE TCAS (ถ้าเว็บไม่อนุญาตให้ฝัง จะเปิดในแท็บใหม่แทน)`,
    Icon: Landmark,
    tone: 'var(--color-brand)',
    logo: `https://assets.mytcas.com/i/logo/${id}.png`,
    category: 'university',
    installable: true,
    url,
    embed: !NO_EMBED_IDS.has(id),
    features: ['เว็บรับสมัครทางการของมหาวิทยาลัย', 'ดูหลักสูตรและเกณฑ์รอบ 3 ได้ในแอป Goal'],
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

// Move `fromId` to where `toId` is (dropping on an icon puts the dragged one in that slot).
// Unknown ids or from === to leave the list as it is.
export function reorderIds(ids, fromId, toId) {
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return ids
  const next = ids.filter((id) => id !== fromId)
  next.splice(to, 0, fromId)
  return next
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
  { id: 'os', label: 'จาก I LOVE TCAS' },
  { id: 'admission', label: 'สมัครและข้อมูลรับเข้า' },
  { id: 'university', label: 'มหาวิทยาลัย' },
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
