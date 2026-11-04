// Development-only sample content for previewing the hub without Firestore data.
// Loaded through a dynamic import behind `import.meta.env.DEV` + `?seed=1` in
// useArticlesStore, so it never ships in the production bundle. Every title and
// figure here is made up.

const COVER = '/assets/hub/campus-hero.svg'
const p = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const h2 = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
const cell = (type, text) => ({ type, content: [p(text)] })
const row = (type, ...texts) => ({ type: 'tableRow', content: texts.map((t) => cell(type, t)) })

const compareBody = {
  type: 'doc',
  content: [
    p('ตัวอย่างบทความเทียบโครงการ ข้อมูลในตารางนี้เป็นตัวอย่างที่แต่งขึ้นเพื่อทดสอบหน้าตาเท่านั้น'),
    h2('โครงการไหนเงื่อนไขเหมือนกัน'),
    {
      type: 'table',
      content: [
        row('tableHeader', 'โครงการ', 'รอบ', 'ที่นั่ง', 'GPAX ขั้นต่ำ'),
        row('tableCell', 'โครงการ A', '1', '24', '3.50'),
        row('tableCell', 'โครงการ B', '1', '30', '3.50'),
        row('tableCell', 'โครงการ C', '3', '60', '-'),
      ],
    },
    h2('น้องควรสมัครอันไหนก่อน'),
    p('โครงการ A และ B ใช้เงื่อนไขเดียวกัน ส่วนโครงการ C เปิดรับในรอบ Admission ลองเรียงลำดับตามความพร้อมของ Portfolio'),
  ],
}
const plainBody = (...lines) => ({ type: 'doc', content: lines.map(p) })

const make = (slug, category, title, excerpt, day, body, extra = {}) => ({
  slug,
  title,
  excerpt,
  category,
  tags: [],
  coverUrl: COVER,
  coverAlt: 'ภาพแคมปัสพิกเซล',
  authorName: 'ทีม I LOVE TCAS',
  publishedAt: `2026-10-${String(day).padStart(2, '0')}T03:00:00.000Z`,
  readingMinutes: 3,
  body: JSON.stringify(body),
  ...extra,
})

export const DEV_ARTICLES = [
  make('sample-medicine-compare', 'compare', 'ทุกโครงการเข้าคณะแพทยศาสตร์ ม.ตัวอย่าง เทียบให้ครบในหน้าเดียว', 'โครงการไหนเงื่อนไขซ้ำกัน ต่างกันตรงไหน และควรสมัครอันไหนก่อน', 15, compareBody, { tags: ['แพทย์'], readingMinutes: 6 }),
  make('sample-news-portfolio', 'news', 'รอบ Portfolio แพทย์ เปิดรับ 24 ที่นั่ง เริ่มสมัครต้นเดือนหน้า', 'สรุปวันสมัคร คะแนนที่ใช้ และเอกสารที่ต้องเตรียม', 14, plainBody('ตัวอย่างข่าว TCAS', 'รายละเอียดเป็นข้อมูลสมมติสำหรับทดสอบหน้าเว็บ')),
  make('sample-news-calendar', 'news', 'ปฏิทิน TCAS70 ช่วงสำคัญที่ต้องรู้ปลายปีนี้', 'รวมวันสมัครและวันสอบทุกรอบในที่เดียว', 12, plainBody('ตัวอย่างข่าวปฏิทิน')),
  make('sample-news-new-projects', 'news', 'ม.ตัวอย่าง เปิดโครงการใหม่ 3 โครงการ ใช้คะแนน TGAT และ TPAT', 'ดูเงื่อนไขและจำนวนที่นั่งแต่ละโครงการ', 9, plainBody('ตัวอย่างข่าวโครงการใหม่')),
  make('sample-guide-math', 'guide', 'ชอบคณิตศาสตร์ เรียนคณะไหนได้บ้าง? รวม 6 คณะ', 'ไล่ดูคณะสายคำนวณพร้อมวิชาที่ต้องใช้ในแต่ละคณะ', 11, plainBody('ตัวอย่างบทความแนะแนว')),
  make('sample-guide-engineering', 'guide', 'ทำความรู้จักสาขาในคณะวิศวกรรมศาสตร์', 'แต่ละสาขาเรียนอะไร จบแล้วทำงานด้านไหน', 8, plainBody('ตัวอย่างบทความแนะแนววิศวะ')),
  make('sample-guide-law', 'guide', 'อยากเป็นนักกฎหมาย เริ่มเตรียมตัวอย่างไร', 'เส้นทางตั้งแต่เลือกคณะจนถึงสอบสัมภาษณ์', 6, plainBody('ตัวอย่างบทความแนะแนวนิติ')),
  make('sample-camp-science', 'camps', 'ค่ายวิทย์ฤดูร้อน เปิดรับสมัครน้อง ม.ปลาย', 'กิจกรรมสุดเข้มข้น 3 วัน 2 คืน', 10, plainBody('ตัวอย่างข่าวค่าย')),
  make('sample-motivation-comparing', 'motivation', 'เครียดเพราะเปรียบเทียบกับเพื่อน รับมือยังไงดี', 'วิธีเล็ก ๆ ที่ช่วยให้ใจเบาลงระหว่างเตรียมสอบ', 7, plainBody('ตัวอย่างบทความให้กำลังใจ')),
  make('sample-motivation-interview', 'motivation', 'เทคนิคสอบสัมภาษณ์ให้ผ่านฉลุย', 'เตรียมตัวอย่างไรให้มั่นใจในห้องสัมภาษณ์', 5, plainBody('ตัวอย่างบทความสัมภาษณ์')),
]

export const DEV_CONFIG = {
  lineOpenChatUrl: 'https://line.me/ti/g2/sample-room',
  lineRules: 'ถามได้ แชร์ได้ ไม่โฆษณา ไม่ล้อเลียนกัน',
  lineModerators: 'พี่ทีม I LOVE TCAS',
  featuredSlug: 'sample-medicine-compare',
  openHouseEnabled: false,
}
