// Curated Roadmap sticker catalog. University logos ride the MyTCAS CDN;
// motivation stickers are emoji baked into SVG data-URLs (offline-safe).
// Premium packs (Epic G) extend this list behind entitlements later.
const LOGO_BASE = 'https://assets.mytcas.com/i/logo'

export function emojiDataUrl(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><text x="50%" y="50%" font-size="72" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const STICKER_CATALOG = [
  { id: 'uni-001', label: 'จุฬาลงกรณ์มหาวิทยาลัย', url: `${LOGO_BASE}/001.png`, group: 'university' },
  { id: 'uni-002', label: 'มหาวิทยาลัยเกษตรศาสตร์', url: `${LOGO_BASE}/002.png`, group: 'university' },
  { id: 'uni-003', label: 'มหาวิทยาลัยขอนแก่น', url: `${LOGO_BASE}/003.png`, group: 'university' },
  { id: 'uni-004', label: 'มหาวิทยาลัยเชียงใหม่', url: `${LOGO_BASE}/004.png`, group: 'university' },
  { id: 'uni-005', label: 'มหาวิทยาลัยธรรมศาสตร์', url: `${LOGO_BASE}/005.png`, group: 'university' },
  { id: 'uni-006', label: 'มหาวิทยาลัยมหิดล', url: `${LOGO_BASE}/006.png`, group: 'university' },
  { id: 'mot-fire', label: 'ไฟลุก', url: emojiDataUrl('🔥'), group: 'motivation' },
  { id: 'mot-star', label: 'ดาว', url: emojiDataUrl('⭐'), group: 'motivation' },
  { id: 'mot-target', label: 'เป้าหมาย', url: emojiDataUrl('🎯'), group: 'motivation' },
  { id: 'mot-trophy', label: 'ถ้วยรางวัล', url: emojiDataUrl('🏆'), group: 'motivation' },
  { id: 'mot-rocket', label: 'จรวด', url: emojiDataUrl('🚀'), group: 'motivation' },
  { id: 'mot-books', label: 'หนังสือ', url: emojiDataUrl('📚'), group: 'motivation' },
]
