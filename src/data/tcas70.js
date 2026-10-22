// TCAS70 (admission for academic year 2570 / 2027) — key dates of the central system.
//
// Researched 2026-10-14 from two independent write-ups that agree on every date below:
//   - PPTV HD36, "เปิดปฏิทิน TCAS70 ..." (26 เม.ย. 2569)  https://www.pptvhd36.com/news/274111
//   - Dreamnest Hub, "ปฏิทิน TCAS69 & TCAS70"             https://dreamnesthub.com/schedule
// Individual universities set their own Portfolio / Quota / Direct Admission windows, so those
// rows are the *central* milestones only. mytcas.com is the authority: always tell students to
// confirm there. This file is the fallback shown while the Firestore `tcasEvents` collection
// is empty; admin-added events take over as soon as any exist.

const SRC = 'https://www.mytcas.com/'

// The admission cycle the built-in calendar and the Plan are about (shown as "แผน TCAS70 ของฉัน").
export const TCAS_LABEL = 'TCAS70'

// [id, ISO date, title, description]
const ROWS = [
  ['mytcas-open',   '2026-07-15', 'เปิดระบบ myTCAS70', 'ลงทะเบียนบัญชี myTCAS ก่อนสมัครรอบ 1 Portfolio'],
  ['r1-open',       '2026-08-15', 'รอบ 1 Portfolio เริ่มรับสมัคร', 'สมัครผ่านระบบของแต่ละมหาวิทยาลัย — วันเปิด/ปิดต่างกันตามมหาวิทยาลัย'],
  ['tgat-register', '2026-11-04', 'เปิดสมัคร TGAT / TPAT2–5', 'สมัครสอบ 4–10 พ.ย. 2569 (ยื่นคำร้องกรณีพิเศษ 11–12 พ.ย.)'],
  ['alevel-register', '2027-01-14', 'เปิดสมัคร A-Level', 'สมัครสอบ 14–20 ม.ค. 2570 (ยื่นคำร้องกรณีพิเศษ 21–22 ม.ค.)'],
  ['tgat-exam',     '2027-01-30', 'สอบ TGAT / TPAT2–5', 'สอบ 30 ม.ค. – 1 ก.พ. 2570 (พิมพ์บัตรประจำตัวสอบ 7 ธ.ค. 2569 – 1 ก.พ. 2570)'],
  ['tpat1-exam',    '2027-02-13', 'สอบ TPAT1 (กสพท)', 'ความถนัดแพทย์ — สมัครตามประกาศของ กสพท.'],
  ['tgat-score',    '2027-02-28', 'ประกาศผลสอบ TGAT / TPAT', 'ขอตรวจสอบคะแนน 1–6 มี.ค. 2570'],
  ['r1-result',     '2027-03-10', 'ประกาศผลรอบ 1 Portfolio', 'ยืนยันสิทธิ์ 10–11 มี.ค. 2570 · สละสิทธิ์ 12 มี.ค.'],
  ['r2-open',       '2027-03-13', 'รอบ 2 Quota เริ่มรับสมัคร', 'สมัครผ่านระบบของแต่ละมหาวิทยาลัย'],
  ['alevel-exam',   '2027-03-13', 'สอบ A-Level', 'สอบ 13–15 มี.ค. 2570 (ประกาศเฉลย 26 มี.ค.)'],
  ['alevel-score',  '2027-04-20', 'ประกาศผลสอบ A-Level', 'ขอตรวจสอบคะแนน 21–27 เม.ย. 2570'],
  ['r2-result',     '2027-05-03', 'ประกาศผลรอบ 2 Quota', 'ยืนยันสิทธิ์ 3–4 พ.ค. 2570 · สละสิทธิ์ 5 พ.ค.'],
  ['r3-open',       '2027-05-07', 'รอบ 3 Admission เริ่มรับสมัคร', 'สมัครผ่าน myTCAS 7–11 พ.ค. 2570 (เปิดเพิ่ม 12–13 พ.ค.) เลือกได้สูงสุด 10 อันดับ'],
  ['r3-result',     '2027-05-22', 'ประกาศผลรอบ 3 Admission (ครั้งที่ 1)', 'ยืนยันสิทธิ์ 22–23 พ.ค. · ประกาศครั้งที่ 2 วันที่ 27 พ.ค. 2570'],
  ['r4-open',       '2027-05-29', 'รอบ 4 Direct Admission เริ่มรับสมัคร', 'รับสมัคร 29 พ.ค. – 15 มิ.ย. 2570 ผ่านระบบของแต่ละมหาวิทยาลัย'],
  ['r4-result',     '2027-06-07', 'ประกาศผลรอบ 4 Direct Admission (ครั้งที่ 1)', 'ประกาศครั้งที่ 2 วันที่ 18 มิ.ย. 2570'],
]

// Plan metadata (ADR-0025): which round an event belongs to, what kind of milestone it is and,
// for exam events, which score keys it covers. Events without an entry here carry none.
const TGAT_KEYS = ['tgat', 'tgat1', 'tgat2', 'tgat3', 'tpat2', 'tpat21', 'tpat3', 'tpat4', 'tpat5']
const TPAT1_KEYS = ['tpat1', 'tpat11', 'tpat13']
const ALEVEL_KEYS = ['a_lv_61', 'a_lv_62', 'a_lv_63', 'a_lv_64', 'a_lv_65', 'a_lv_66', 'a_lv_70',
  'a_lv_81', 'a_lv_82', 'a_lv_83', 'a_lv_84', 'a_lv_85', 'a_lv_86', 'a_lv_87', 'a_lv_88', 'a_lv_89']
const PLAN_META = {
  'r1-open':         { round: 1, kind: 'apply' },
  'r1-result':       { round: 1, kind: 'announce' },
  'r2-open':         { round: 2, kind: 'apply' },
  'r2-result':       { round: 2, kind: 'announce' },
  'r3-open':         { round: 3, kind: 'apply' },
  'r3-result':       { round: 3, kind: 'announce' },
  'r4-open':         { round: 4, kind: 'apply' },
  'r4-result':       { round: 4, kind: 'announce' },
  'tgat-register':   { kind: 'apply', examKeys: TGAT_KEYS },
  'alevel-register': { kind: 'apply', examKeys: ALEVEL_KEYS },
  'tgat-exam':       { kind: 'exam', examKeys: TGAT_KEYS },
  'tpat1-exam':      { kind: 'exam', examKeys: TPAT1_KEYS },
  'alevel-exam':     { kind: 'exam', examKeys: ALEVEL_KEYS },
  'tgat-score':      { kind: 'announce', examKeys: TGAT_KEYS },
  'alevel-score':    { kind: 'announce', examKeys: ALEVEL_KEYS },
}

export const TCAS70_EVENTS = ROWS.map(([id, date, title, description]) => ({
  id: `tcas70-${id}`, date, title, description, link: SRC, builtIn: true, ...PLAN_META[id],
}))

const DAY_MS = 86400000
const asUtcDay = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))

// Whole days from `todayIso` to `dateIso` (0 = today, negative = past).
export function daysUntil(dateIso, todayIso) {
  return Math.round((asUtcDay(dateIso) - asUtcDay(todayIso)) / DAY_MS)
}

// Admin-added events win; the built-in calendar only fills an otherwise empty board.
export function eventsWithFallback(events) {
  return events?.length ? events : TCAS70_EVENTS
}

// The next milestone on or after today, with its countdown; null when everything has passed.
export function nextMilestone(events, todayIso) {
  const next = [...events].sort((a, b) => a.date.localeCompare(b.date)).find((e) => e.date >= todayIso)
  return next ? { event: next, days: daysUntil(next.date, todayIso) } : null
}
