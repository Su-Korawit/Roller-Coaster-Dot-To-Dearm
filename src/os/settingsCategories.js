// Settings app — categories in display order. Each one is a page inside the app.
//   id     key of the page component in SettingsApp
//   label  title shown in the list and the page header
//   hint   one line under the title in the list
export const SETTINGS_CATEGORIES = [
  { id: 'account',  label: 'บัญชีและโปรไฟล์',     hint: 'ชื่อ รูป แนะนำตัว' },
  { id: 'display',  label: 'หน้าจอและวอลเปเปอร์', hint: 'พื้นหลังและรูปโปรไฟล์บนหน้า Home' },
  { id: 'sound',    label: 'เสียงและการควบคุม',    hint: 'เสียงเอฟเฟกต์ วิธีเดินในเกม' },
  { id: 'ai',       label: 'AI และเลขา',           hint: 'ภาษาที่ AI ตอบ และเลขาพี่ใจดี' },
  { id: 'security', label: 'ความปลอดภัย',          hint: 'รหัสผ่านปลดล็อกเครื่องนี้' },
  { id: 'privacy',  label: 'ความเป็นส่วนตัว',      hint: 'ใครเห็นพอร์ตของเราได้บ้าง' },
  { id: 'about',    label: 'เกี่ยวกับและบัญชี',    hint: 'นโยบาย ออกจากระบบ ลบบัญชี' },
]
