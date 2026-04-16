// Centralised skill catalog for the Roller Coaster app

const img = (name) =>
  new URL(`../../assets/eachPageAssets/skill/Skill/${name}.png`, import.meta.url).href

export const SKILLS = [
  // ── Passive Skills ──────────────────────────────────────────────
  {
    id: 'spark',
    name: 'Spark',
    type: 'passive',
    cost: 99,
    emoji: '✨',
    image: img('Spark'),
    tagline: 'Instant Coin Burst',
    description:
      'ทุกครั้งที่ Complete Task → เหรียญกระจาย +2 ทันที พร้อม Animation สุดสนุก',
    effect: '+2 bonus coins on every task completion',
    mbtiMatch: ['ENFP', 'ENTP', 'ESFP', 'ESTP'],
  },
  {
    id: 'flow',
    name: 'Flow',
    type: 'passive',
    cost: 149,
    emoji: '🔗',
    image: img('Flow'),
    tagline: 'Combo Multiplier',
    description:
      'ทำ Task ต่อเนื่องภายใน 10 นาที → Multiplier ×1.1, ×1.2, ×1.3 stack ขึ้นเรื่อยๆ',
    effect: 'Coins ×1.1~1.3 when tasks done back-to-back',
    mbtiMatch: ['INTJ', 'INTP', 'INFJ', 'INFP'],
  },
  {
    id: 'depth',
    name: 'Depth',
    type: 'passive',
    cost: 179,
    emoji: '🏆',
    image: img('Depth'),
    tagline: 'Long Session Boost',
    description:
      'Task ที่ใช้เวลา > 1 ชั่วโมง จะได้ Coins ×1.5 โดยอัตโนมัติ',
    effect: '×1.5 coins for tasks longer than 60 min',
    mbtiMatch: ['INTJ', 'ISTJ', 'INFJ', 'ENTJ'],
  },
  {
    id: 'grace',
    name: 'Grace',
    type: 'passive',
    cost: 129,
    emoji: '💖',
    image: img('Grace'),
    tagline: 'Streak Shield',
    description:
      'พลาด Streak 1 วัน → ไม่โดน Penalty ครั้งเดียวต่อสัปดาห์',
    effect: 'Skip 1 streak penalty per week',
    mbtiMatch: ['ISFJ', 'INFP', 'ENFP', 'ESFJ'],
  },

  // ── Active Skills ────────────────────────────────────────────────
  {
    id: 'ignite',
    name: 'Ignite',
    type: 'active',
    cost: 99,
    emoji: '🚀',
    image: img('Ignite'),
    tagline: '5-Second Launch',
    description:
      'เริ่มนับถอยหลัง 5→1 เพื่อจุดไฟก่อนเริ่มงาน ช่วยลดการผัดวันและพาคุณลงมือทันที',
    effect: 'Countdown 5s → instantly start the task',
    mbtiMatch: ['ENFP', 'ENTP', 'INFP', 'INTP'],
  },
  {
    id: 'capsule',
    name: 'Capsule',
    type: 'active',
    cost: 149,
    emoji: '⏳',
    image: img('Capsule'),
    tagline: '30-Minute Lock',
    description:
      'ล็อก 30 นาที — ถ้าทำ Task เสร็จทันเวลา รับ Coins +50%',
    effect: '+50% coins if task finished within 30 min',
    mbtiMatch: ['ESTJ', 'ENTJ', 'ISTJ', 'INTJ'],
  },
  {
    id: 'draw',
    name: 'Draw',
    type: 'active',
    cost: 79,
    emoji: '🎴',
    image: img('Draw'),
    tagline: 'Random Task Draw',
    description:
      'สุ่มเลือก Task จาก Todo list มาให้ทำ — ดีสำหรับวันที่ตัดสินใจไม่ได้',
    effect: 'Randomly picks a pending task for you',
    mbtiMatch: ['ENFP', 'ESFP', 'ENTP', 'ESTP'],
  },
  {
    id: 'revive',
    name: 'Revive',
    type: 'active',
    cost: 199,
    emoji: '🛡️',
    image: img('Revive'),
    tagline: 'Streak Revival',
    description:
      'กู้คืน Streak ที่หาย — ใช้ได้ 1 ครั้งต่อเดือน',
    effect: 'Restore broken streak once per month',
    mbtiMatch: ['ISFP', 'INFP', 'ESFJ', 'ENFJ'],
  },
]

export const PASSIVE_SKILLS = SKILLS.filter((s) => s.type === 'passive')
export const ACTIVE_SKILLS = SKILLS.filter((s) => s.type === 'active')

export function getSkillById(id) {
  return SKILLS.find((s) => s.id === id) || null
}
