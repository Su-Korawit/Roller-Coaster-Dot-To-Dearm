// Site registry — one entry per host (ADR-0012). Pure data, no imports:
// scripts/prerender.mjs imports this from Node, so keep it dependency-free.
// Field roles (design.md §13): `title`/`description` are HEAD-ONLY (SEO tags +
// prerender — never render them in visible UI); `h1`/`intro` are the on-page
// landing copy; `pixelName` is the Latin display name for the pixel font
// (Press Start 2P has no Thai glyphs); `shortName` is the Thai nav/menu label.
export const SITES = {
  hub: {
    key: 'hub',
    subdomain: '',
    path: 'https://ilovetcas.com',
    pixelName: 'I LOVE TCAS',
    shortName: 'หน้าแรก',
    title: 'I LOVE TCAS — รวมเครื่องมือวางแผนสอบติดมหาลัย ฟรี',
    description:
      'เครื่องมือ TCAS ครบในที่เดียว: วางแผนเส้นทางเข้ามหาลัย ค้นหาคณะและมหาวิทยาลัย ปฏิทินกำหนดการ TCAS ตารางเรียนและการบ้าน — ใช้ฟรี ไม่ต้องสมัคร',
    h1: 'เครื่องมือสอบติดมหาลัย ครบทุกอย่าง ในที่เดียว',
    intro:
      'วางแผนเส้นทาง ค้นหาคณะจากข้อมูล MyTCAS ตามข่าวและปฏิทิน TCAS จัดตารางเรียนและการบ้าน — ใช้ฟรีทันที ไม่ต้องสมัครสมาชิก',
  },
  roadmap: {
    key: 'roadmap',
    subdomain: 'roadmap',
    path: 'https://roadmap.ilovetcas.com',
    pixelName: 'ROADMAP',
    shortName: 'วางแผนเส้นทาง',
    title: 'Roadmap วางแผนเส้นทางเข้ามหาลัย ฟรี | I LOVE TCAS',
    description:
      'เครื่องมือวางแผนเส้นทางสู่มหาวิทยาลัยแบบเห็นภาพ ลากวางเป็นแผนผัง ตั้งเป้าหมาย แบ่งขั้นตอน ใช้ฟรีไม่ต้องสมัครสมาชิก',
    h1: 'วางแผนเส้นทางเข้ามหาลัยของคุณ แบบเห็นภาพ',
    intro:
      'สร้าง Roadmap สู่คณะในฝันด้วยการลากวางบล็อกเป้าหมาย เงื่อนไข และรูปภาพ เริ่มใช้ได้ทันทีโดยไม่ต้องเข้าสู่ระบบ งานถูกเก็บไว้ในเครื่อง และบันทึกขึ้นคลาวด์ได้เมื่อพร้อม',
  },
  tcas: {
    key: 'tcas',
    subdomain: 'tcas',
    path: 'https://tcas.ilovetcas.com',
    pixelName: 'TCAS SEARCH',
    shortName: 'ค้นหาคณะ',
    title: 'ค้นหาคณะ มหาวิทยาลัย และหลักสูตร TCAS | I LOVE TCAS',
    description:
      'ค้นหาคณะ มหาวิทยาลัย และหลักสูตรทั่วประเทศจากข้อมูล MyTCAS อัปเดตตามรอบ TCAS — ค้นหาฟรี ไม่ต้องเข้าสู่ระบบ',
    h1: 'ค้นหาคณะและมหาวิทยาลัยทั่วประเทศ',
    intro:
      'ข้อมูลหลักสูตรจาก MyTCAS ค้นหาด้วยชื่อคณะ มหาวิทยาลัย หรือสาขาที่สนใจ ดูรายละเอียดได้ทันทีโดยไม่ต้องสมัครสมาชิก',
  },
  news: {
    key: 'news',
    subdomain: 'news',
    path: 'https://news.ilovetcas.com',
    pixelName: 'NEWS',
    shortName: 'ข่าว + ปฏิทิน',
    title: 'ข่าว TCAS และปฏิทินกำหนดการสำคัญ | I LOVE TCAS',
    description:
      'รวมข่าวค่าย กิจกรรม และปฏิทินกำหนดการ TCAS ทุกรอบ พร้อมไทม์ไลน์นับถอยหลังวันสำคัญ — อ่านฟรี ไม่ต้องเข้าสู่ระบบ',
    h1: 'ข่าวและปฏิทิน TCAS ครบทุกกำหนดการ',
    intro:
      'ตามข่าวค่าย กิจกรรมรับตรง และกำหนดการ TCAS ทุกรอบในไทม์ไลน์เดียว เพิ่มกำหนดการเข้าปฏิทินส่วนตัวได้เมื่อเข้าสู่ระบบ',
  },
  school: {
    key: 'school',
    subdomain: 'school',
    path: 'https://school.ilovetcas.com',
    pixelName: 'SCHOOL',
    shortName: 'ตารางเรียน + การบ้าน',
    title: 'ตารางเรียน การบ้าน และ To-Do List นักเรียน ฟรี | I LOVE TCAS',
    description:
      'จัดตารางเรียน บันทึกการบ้าน เช็กลิสต์งานที่ต้องส่ง และโน้ตประจำวัน ในที่เดียว — ใช้ฟรี ไม่ต้องสมัครสมาชิก',
    h1: 'ตารางเรียน การบ้าน และ to-do ครบในที่เดียว',
    intro:
      'สร้างตารางเรียนรายสัปดาห์ บันทึกการบ้านและงานที่ต้องส่งพร้อมวันกำหนด เขียนโน้ตประจำวัน เริ่มใช้ได้ทันทีโดยไม่ต้องเข้าสู่ระบบ',
  },
  app: {
    key: 'app',
    subdomain: 'app',
    path: 'https://app.ilovetcas.com',
    pixelName: 'PLAY',
    shortName: 'เข้าแอปเต็ม + เกม',
    title: 'I LOVE TCAS — วางแผนเส้นทางสู่มหาลัยแบบเกม',
    description:
      'แอปวางแผนเส้นทางสู่มหาวิทยาลัยแบบ gamification: MBTI, Roadmap, ฟาร์ม, เพื่อนร่วมทาง และภารกิจรายวัน',
    h1: 'I LOVE TCAS — แอปเต็มรูปแบบ',
    intro: 'เข้าสู่แอปเต็มรูปแบบพร้อมเกม ภารกิจรายวัน และเพื่อนร่วมเส้นทางสู่มหาลัย',
  },
}
