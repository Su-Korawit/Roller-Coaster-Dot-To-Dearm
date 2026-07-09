import { Blocks, Palette, HardDriveDownload } from 'lucide-react'
import LandingShell from '../../components/landing/LandingShell'

const BENEFITS = [
  { icon: Blocks, title: 'ลากวางได้อิสระ', text: 'วางบล็อกเป้าหมาย คณะ และกิจกรรมบนแผนภาพแบบ visual' },
  { icon: Palette, title: 'ตกแต่งได้', text: 'สติกเกอร์ สี และเส้นเชื่อม — ทำให้แผนของคุณเป็นของคุณจริงๆ' },
  { icon: HardDriveDownload, title: 'ใช้ได้ทันที', text: 'ไม่ต้องล็อกอิน งานเก็บในเครื่องอัตโนมัติ — ล็อกอินเมื่อพร้อม sync ขึ้น cloud' },
]

export default function RoadmapLanding() {
  return (
    <LandingShell
      siteKey="roadmap"
      toolPath="/editor"
      toolLabel="เริ่มวางแผนเลย"
      benefits={BENEFITS}
      screenshotLabel="ตัวอย่างหน้าจอ Roadmap"
    />
  )
}
