import { CalendarDays, ListChecks, NotebookPen } from 'lucide-react'
import LandingShell from '../../components/landing/LandingShell'

const BENEFITS = [
  { icon: CalendarDays, title: 'ตารางเรียน', text: 'จัดตารางเรียนรายวัน พร้อมโหลดเทมเพลตจากชุมชน' },
  { icon: ListChecks, title: 'การบ้าน & To-do', text: 'ติดตามงานที่ต้องส่ง แยกตามวิชา และวันครบกำหนด' },
  { icon: NotebookPen, title: 'Notebook', text: 'จดโน้ตประจำวัน ส่งออก/นำเข้า JSON ได้' },
]

export default function SchoolLanding() {
  return (
    <LandingShell
      siteKey="school"
      toolPath="/app"
      toolLabel="เปิดระบบโรงเรียน"
      benefits={BENEFITS}
      screenshotLabel="ตัวอย่างหน้าจอ School System"
    />
  )
}
