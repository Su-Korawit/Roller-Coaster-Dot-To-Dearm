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
    title: 'I LOVE TCAS — บทความและเครื่องมือวางแผนสอบติดมหาลัย TCAS',
    description:
      'อ่านบทความเลือกคณะ เทียบทุกโครงการรับสมัคร ข่าว TCAS และกิจกรรมค่าย พร้อมเครื่องมือวางแผนเส้นทางเข้ามหาลัย ใช้ฟรี ไม่ต้องสมัครสมาชิก',
    h1: 'วางแผนสอบติดมหาลัย แบบเล่นเกม',
    intro:
      'เดินดูทุกคณะในแคมปัสพิกเซล เห็นเส้นทางเข้าทุกรอบ แล้วอ่านบทความที่ช่วยเลือกโครงการ',
  },
  roadmap: {
    key: 'roadmap',
    subdomain: 'roadmap',
    path: 'https://roadmap.ilovetcas.com',
    pixelName: 'ROADMAP',
    shortName: 'วางแผนเส้นทาง',
    title: 'Roadmap วางแผนเส้นทางเข้ามหาลัย ฟรี | I LOVE TCAS',
    description:
      'เครื่องมือวางแผนเส้นทางสู่มหาวิทยาลัยแบบเห็นภาพ ลากวางบล็อกเป้าหมายเป็นแผนผัง แบ่งขั้นตอนชัดเจน ใช้ฟรี ไม่ต้องสมัครสมาชิก',
    h1: 'วางแผนเส้นทางเข้ามหาลัยของคุณ แบบเห็นภาพ',
    intro:
      'ลากวางบล็อกเป้าหมาย เงื่อนไข และรูปภาพเป็น Roadmap สู่คณะในฝัน เริ่มใช้ได้เลยโดยไม่ต้องเข้าสู่ระบบ งานเก็บในเครื่อง และอัปขึ้นคลาวด์ได้เมื่อพร้อม',
  },
  tcas: {
    key: 'tcas',
    subdomain: 'tcas',
    path: 'https://tcas.ilovetcas.com',
    pixelName: 'TCAS SEARCH',
    shortName: 'ค้นหาคณะ',
    title: 'ค้นหาคณะ มหาวิทยาลัย และหลักสูตร TCAS | I LOVE TCAS',
    description:
      'ค้นหาคณะ มหาวิทยาลัย และหลักสูตรทั่วประเทศจากข้อมูล MyTCAS จริง อัปเดตตามรอบรับสมัครแต่ละปี ค้นหาได้ฟรี ไม่ต้องเข้าสู่ระบบ',
    h1: 'ค้นหาคณะและมหาวิทยาลัยทั่วประเทศ',
    intro:
      'ข้อมูลหลักสูตรจาก MyTCAS ค้นด้วยชื่อคณะ มหาวิทยาลัย หรือสาขาที่สนใจ ดูรายละเอียดได้ทันทีโดยไม่ต้องสมัคร',
  },
  news: {
    key: 'news',
    subdomain: 'news',
    path: 'https://news.ilovetcas.com',
    pixelName: 'NEWS',
    shortName: 'ข่าว + ปฏิทิน',
    title: 'ข่าว TCAS และปฏิทินกำหนดการสำคัญ | I LOVE TCAS',
    description:
      'รวมข่าวค่าย กิจกรรมรับตรง และปฏิทินกำหนดการสอบ TCAS ทุกรอบ พร้อมไทม์ไลน์นับถอยหลังวันสำคัญ อ่านได้ฟรี ไม่ต้องเข้าสู่ระบบ',
    h1: 'ข่าวและปฏิทิน TCAS ตามกำหนดการจริง',
    intro:
      'ตามข่าวค่าย กิจกรรมรับตรง และกำหนดการ TCAS ทุกรอบในไทม์ไลน์เดียว เมื่อเข้าสู่ระบบจะเพิ่มเข้าปฏิทินส่วนตัวได้',
  },
  school: {
    key: 'school',
    subdomain: 'school',
    path: 'https://school.ilovetcas.com',
    pixelName: 'SCHOOL',
    shortName: 'ตารางเรียน + การบ้าน',
    title: 'ตารางเรียน การบ้าน และ To-Do List นักเรียน ฟรี | I LOVE TCAS',
    description:
      'จัดตารางเรียนรายสัปดาห์ บันทึกการบ้าน เช็กลิสต์งานที่ต้องส่ง และโน้ตประจำวันไว้ในหน้าเดียว เปิดใช้ได้ฟรี ไม่ต้องสมัครสมาชิก',
    h1: 'ตารางเรียน การบ้าน และ to-do ของนักเรียน',
    intro:
      'สร้างตารางเรียนรายสัปดาห์ จดการบ้านพร้อมวันกำหนด เขียนโน้ตประจำวัน เปิดใช้ได้ทันทีโดยไม่ต้องเข้าสู่ระบบ',
  },
  bag: {
    key: 'bag',
    subdomain: 'bag',
    path: 'https://bag.ilovetcas.com',
    pixelName: 'FILE BAG',
    shortName: 'กระเป๋าไฟล์',
    title: 'File Bag — รวมไฟล์และโฟลเดอร์ของคุณ | I LOVE TCAS',
    description:
      'รวมรูป วิดีโอ และไฟล์ที่อัปโหลดจาก Roadmap และ Notebook จัดเป็นโฟลเดอร์แบบ Desktop ใช้ได้บนคอมและมือถือ ต้องเข้าสู่ระบบ',
    h1: 'กระเป๋าไฟล์ของคุณ บนเดสก์ท็อปเสมือน',
    intro:
      'ลากวางไฟล์ จัดโฟลเดอร์ คัดลอกและทำซ้ำได้ ต้องเข้าสู่ระบบเพื่อดูไฟล์ที่เคยอัปโหลด',
  },
  app: {
    key: 'app',
    subdomain: 'app',
    path: 'https://app.ilovetcas.com',
    pixelName: 'PLAY',
    shortName: 'เข้าแอปเต็ม + เกม',
    title: 'I LOVE TCAS — วางแผนเส้นทางสู่มหาลัยแบบเกม',
    description:
      'แอปวางแผนเส้นทางสู่มหาวิทยาลัยแบบเกม มีแบบทดสอบ MBTI, Roadmap ลากวาง, ฟาร์มสไตล์ pixel, เพื่อนร่วมทาง และภารกิจรายวันให้ทำ',
    h1: 'I LOVE TCAS แอปเต็มรูปแบบ',
    intro: 'เข้าแอปเต็ม มีเกม ภารกิจรายวัน และเพื่อนที่เดินทางไปมหาลัยด้วยกัน',
  },
}
