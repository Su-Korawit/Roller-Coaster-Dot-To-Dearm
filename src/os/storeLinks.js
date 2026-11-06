import { Tent, Trophy, Medal, GraduationCap, Calculator, Newspaper, ClipboardList } from 'lucide-react'

// Websites listed in the Store. They open in a new tab (most sites block being embedded).
export const STORE_LINKS = [
  { id: 'link-camphub', name: 'Camphub', tagline: 'ค่าย/กิจกรรมสำหรับนักเรียน', url: 'https://www.camphub.in.th/', Icon: Tent, tone: 'var(--color-zone-earth)' },
  { id: 'link-tcaster', name: 'TCASter', tagline: 'ข้อมูลและติวเข้ามหาวิทยาลัย', url: 'https://tcaster.net/', Icon: GraduationCap, tone: 'var(--color-zone-sci)' },
  { id: 'link-portcas', name: 'Portcas', tagline: 'รวมการแข่งขัน/ประกวด', url: 'https://www.portcas.com/competition', Icon: Trophy, tone: 'var(--color-zone-biz)' },
  { id: 'link-mytcas', name: 'MyTCAS', tagline: 'ระบบ TCAS ทางการ', url: 'https://www.mytcas.com/', Icon: ClipboardList, tone: 'var(--color-brand)' },
  { id: 'link-smartmathpro', name: 'SmartMathPro', tagline: 'เรียนและฝึกคณิตศาสตร์', url: 'https://www.smartmathpro.com/', Icon: Calculator, tone: 'var(--color-zone-health)' },
  { id: 'link-dekd', name: 'Dek-D', tagline: 'ชุมชนและข่าวสารวัยเรียน', url: 'https://www.dek-d.com/', Icon: Newspaper, tone: 'var(--color-zone-arts)' },
  { id: 'link-dekd-pre', name: 'Dek-D Admission', tagline: 'ข้อมูลรับตรง/แอดมิชชัน', url: 'https://www.dek-d.com/pre-admission/', Icon: Medal, tone: 'var(--color-zone-soc)' },
]
