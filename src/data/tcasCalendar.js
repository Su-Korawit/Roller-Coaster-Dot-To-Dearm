// TCAS70 (ปีการศึกษา 2570 = ค.ศ. 2027) key dates, researched 2026-11-07 from the ทปอ./mytcas calendar
// as reported by several sites (TruePlookPanya, PPTV, Thairath, Matichon, SmartMathPro, EduFriend).
// Sources agree on the exam dates; round 3/4 end dates differ slightly between sources, so those
// carry a note. Always check mytcas.com for the official calendar before applying.

export const TCAS_CALENDAR = {
  label: 'TCAS70',
  checkedAt: '2026-11-07',
  exams: [
    { id: 'tgat', label: 'สอบ TGAT และ TPAT2-5', start: '2027-01-30', end: '2027-02-01', match: /^(TGAT|TPAT\s?[2-5])/i },
    { id: 'tpat1', label: 'สอบ TPAT1 (กสพท.)', start: '2027-02-13', end: null, match: /^TPAT\s?1/i },
    { id: 'alevel', label: 'สอบ A-Level', start: '2027-03-13', end: '2027-03-15', match: /^(A[\s-]?LEVEL|A_LV)/i },
  ],
  rounds: [
    { round: 1, label: 'Portfolio', start: null, end: null, result: '2027-03-10', note: 'แต่ละมหาวิทยาลัยกำหนดช่วงรับสมัครเอง' },
    { round: 2, label: 'โควตา', start: '2027-03-13', end: null, result: '2027-05-03', note: 'วันปิดรับสมัครแต่ละมหาวิทยาลัยกำหนดเอง' },
    { round: 3, label: 'Admission', start: '2027-05-07', end: '2027-05-13', result: null, note: 'สมัคร 7-11 พ.ค. และสมัครเพิ่มเติม 12-13 พ.ค. · วันประกาศผลตามประกาศ ทปอ.' },
    { round: 4, label: 'Direct Admission', start: '2027-05-29', end: null, result: '2027-06-18', note: 'แหล่งข่าวระบุวันปิดรับสมัครต่างกัน (5 หรือ 15 มิ.ย.) · ประกาศผลครั้งที่ 1 ประมาณ 18-19 มิ.ย.' },
  ],
}

// Exam day of a subject label ("TGAT1", "TPAT3", "A-Level คณิตศาสตร์ 1"), or null if unknown.
export function examDateForSubject(subject = '') {
  const s = String(subject).trim()
  return TCAS_CALENDAR.exams.find((e) => e.match.test(s))?.start ?? null
}

// First exam day among a goal's subjects (the date everything must be ready for first). Falls back
// to the first exam of the season when the goal has no recognised subject yet.
export function firstExamDate(subjects = []) {
  const dates = subjects.map((s) => examDateForSubject(typeof s === 'string' ? s : s.subject)).filter(Boolean).sort()
  return dates[0] ?? TCAS_CALENDAR.exams[0].start
}

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const part = (key) => { const [y, m, d] = key.split('-').map(Number); return { y: y + 543, m: m - 1, d } }

// "2027-01-30","2027-02-01" → "30 ม.ค. - 1 ก.พ. 2570"; one date → "13 ก.พ. 2570".
export function formatThaiRange(start, end) {
  if (!start) return ''
  const a = part(start)
  if (!end || end === start) return `${a.d} ${MONTHS[a.m]} ${a.y}`
  const b = part(end)
  const left = a.m === b.m && a.y === b.y ? `${a.d}` : `${a.d} ${MONTHS[a.m]}${a.y === b.y ? '' : ` ${a.y}`}`
  return `${left} - ${b.d} ${MONTHS[b.m]} ${b.y}`
}
