// ─── RollerCoaster App Updates ───────────────────────────────────────────────
// ป้ายกำกับประเภทของแต่ละ update
export const UPDATE_TYPES = {
  new:    { label: 'ใหม่',    color: 'bg-green-100 text-green-600' },
  update: { label: 'อัปเดต',  color: 'bg-blue-100 text-blue-600' },
  fix:    { label: 'แก้บั๊ก', color: 'bg-orange-100 text-orange-600' },
}

// นักพัฒนาเพิ่ม update ใหม่ได้ที่นี่ (Admin เพิ่มผ่านฟอร์มในแอปได้เช่นกัน)
export const STATIC_UPDATES = [
  {
    id: 'su-1',
    type: 'new',                 // key ใน UPDATE_TYPES
    title: 'เปิดตัว News Panel ดึงข้อมูลค่ายจาก Camphub',
    description: 'ดูค่าย/กิจกรรมล่าสุดจาก camphub.in.th ได้ในแอปแล้ว',
    image: null,                 // ใส่ URL รูป หรือ null
    date: '2026-06-04',          // ISO date string
  },
]
