// MBTI temperament perks (ADR 0018) — display side. The server applies them in
// the Focus callables (functions/temperaments.js); a test keeps the MBTI map in
// step. Perks scale Focus XP only, never the hours behind the school leaderboard.

export const TEMPERAMENT_BY_MBTI = {
  INTJ: 'NT', INTP: 'NT', ENTJ: 'NT', ENTP: 'NT',
  INFJ: 'NF', INFP: 'NF', ENFJ: 'NF', ENFP: 'NF',
  ISTJ: 'SJ', ISFJ: 'SJ', ESTJ: 'SJ', ESFJ: 'SJ',
  ISTP: 'SP', ISFP: 'SP', ESTP: 'SP', ESFP: 'SP',
}

export const TEMPERAMENTS = {
  NT: {
    id: 'NT', name: 'นักวิเคราะห์', emoji: '🧠',
    perk: 'โฟกัสลึก',
    description: 'ได้ XP เพิ่ม 10% เมื่ออ่านต่อเนื่องในรอบเดียวครบ 50 นาที',
  },
  NF: {
    id: 'NF', name: 'นักอุดมคติ', emoji: '🌙',
    perk: 'นกฮูกกลางคืน',
    description: 'ได้ XP เพิ่ม 10% เมื่ออ่านหนังสือช่วง 20:00–01:59 น.',
  },
  SJ: {
    id: 'SJ', name: 'ผู้พิทักษ์', emoji: '🛡️',
    perk: 'วินัยสม่ำเสมอ',
    description: 'ได้ XP เพิ่ม 10% เมื่อเมื่อวานนี้ก็อ่านหนังสือไปอย่างน้อย 20 นาที',
  },
  SP: {
    id: 'SP', name: 'นักผจญภัย', emoji: '⚡',
    perk: 'สปรินต์เปิดวัน',
    description: 'ได้ XP เพิ่ม 10% ใน 30 นาทีแรกของแต่ละวัน',
  },
}

export function temperamentOf(mbti) {
  if (typeof mbti !== 'string') return null
  const id = TEMPERAMENT_BY_MBTI[mbti.toUpperCase()]
  return id ? TEMPERAMENTS[id] : null
}
