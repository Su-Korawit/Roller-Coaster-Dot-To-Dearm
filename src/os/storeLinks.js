import { Tent, Trophy, Medal, GraduationCap, Calculator, Newspaper, ClipboardList, School, Search } from 'lucide-react'
import { TUTORING_SITES, faviconUrl } from '../data/tutoringSites'

// Websites listed in the Store. They open in a new tab (most sites block being embedded).
// `embed: false` = the site forbids being shown inside other sites (X-Frame-Options / frame-ancestors, checked 2026-11-07).
// `category` is one of CATEGORIES in apps.js; logos are full-bleed squares (no inner padding).
const BASE_LINKS = [
  { id: 'link-camphub', category: 'activity', embed: false, logo: '/assets/os/logos/link-camphub.webp', name: 'Camphub', tagline: 'ค่าย/กิจกรรมสำหรับนักเรียน', url: 'https://www.camphub.in.th/', Icon: Tent, tone: 'var(--color-zone-earth)' },
  { id: 'link-tcaster', category: 'learn', logo: '/assets/os/logos/link-tcaster.webp', name: 'TCASter', tagline: 'ข้อมูลและติวเข้ามหาวิทยาลัย', url: 'https://tcaster.net/', Icon: GraduationCap, tone: 'var(--color-zone-sci)' },
  { id: 'link-portcas', category: 'activity', logo: '/assets/os/logos/link-portcas.webp', name: 'Portcas', tagline: 'รวมการแข่งขัน/ประกวด', url: 'https://www.portcas.com/competition', Icon: Trophy, tone: 'var(--color-zone-biz)' },
  { id: 'link-mytcas', category: 'admission', logo: '/assets/os/logos/link-mytcas.webp', name: 'MyTCAS', tagline: 'ระบบ TCAS ทางการ', url: 'https://www.mytcas.com/', Icon: ClipboardList, tone: 'var(--color-brand)' },
  { id: 'link-kuadmission', category: 'university', embed: false, logo: '/assets/os/logos/link-kuadmission.webp', name: 'KU บางเขน', tagline: 'รับสมัครนิสิต ม.เกษตรศาสตร์ วิทยาเขตบางเขน', url: 'https://admission.ku.ac.th/kuadm/', Icon: School, tone: 'var(--color-zone-earth)' },
  { id: 'link-ku-kps', category: 'university', embed: false, logo: '/assets/os/logos/link-kuadmission.webp', name: 'KU กำแพงแสน', tagline: 'รับสมัครนิสิต ม.เกษตรศาสตร์ วิทยาเขตกำแพงแสน', url: 'https://admission.kps.ku.ac.th/', Icon: School, tone: 'var(--color-zone-earth)' },
  { id: 'link-ku-src', category: 'university', logo: '/assets/os/logos/link-kuadmission.webp', name: 'KU ศรีราชา', tagline: 'รับสมัครนิสิต ม.เกษตรศาสตร์ วิทยาเขตศรีราชา', url: 'https://admissions.src.ku.ac.th/', Icon: School, tone: 'var(--color-zone-earth)' },
  { id: 'link-ku-csc', category: 'university', embed: false, logo: '/assets/os/logos/link-kuadmission.webp', name: 'KU สกลนคร', tagline: 'รับสมัครนิสิต ม.เกษตรศาสตร์ เฉลิมพระเกียรติ จ.สกลนคร', url: 'https://misreg.csc.ku.ac.th/admission/', Icon: School, tone: 'var(--color-zone-earth)' },
  { id: 'link-tcasin', category: 'admission', logo: '/assets/os/logos/link-tcasin.webp', name: 'TCAS Starter', tagline: 'เช็กข้อมูลรอบ 1-4 ของ Dek-D (ไม่ทางการ)', url: 'https://tcas.in.th/', Icon: Search, tone: 'var(--color-zone-biz)' },
  { id: 'link-smartmathpro', category: 'learn', logo: '/assets/os/logos/link-smartmathpro.webp', name: 'SmartMathPro', tagline: 'เรียนและฝึกคณิตศาสตร์', url: 'https://www.smartmathpro.com/', Icon: Calculator, tone: 'var(--color-zone-health)' },
  { id: 'link-dekd', category: 'news', embed: false, logo: '/assets/os/logos/link-dekd.webp', name: 'Dek-D', tagline: 'ชุมชนและข่าวสารวัยเรียน', url: 'https://www.dek-d.com/', Icon: Newspaper, tone: 'var(--color-zone-arts)' },
  { id: 'link-dekd-pre', category: 'admission', embed: false, logo: '/assets/os/logos/link-dekd-pre.webp', name: 'Dek-D Admission', tagline: 'ข้อมูลรับตรง/แอดมิชชัน', url: 'https://www.dek-d.com/pre-admission/', Icon: Medal, tone: 'var(--color-zone-soc)' },
]

// One Store app per tutoring institute (category 'learn'), same as SmartMathPro above. Logo = the site's favicon.
const TUTOR_LINKS = TUTORING_SITES.map((t) => ({
  id: t.id,
  category: 'learn',
  embed: t.embed,
  logo: faviconUrl(t.url),
  name: t.name,
  tagline: t.area ? `สถาบันกวดวิชา · ${t.area}` : 'สถาบันกวดวิชา · ออนไลน์/ทั่วประเทศ',
  url: t.url,
  Icon: GraduationCap,
  tone: 'var(--color-zone-sci)',
}))

export const STORE_LINKS = [...BASE_LINKS, ...TUTOR_LINKS]
