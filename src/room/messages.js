// Thai explanations for Study Room outcomes the student can cause.

// A failed purchase: the server's reason (HttpsError details) or a generic fallback.
export function describeBuyError(err) {
  const d = err?.details ?? {}
  if (d.reason === 'INSUFFICIENT_LEAVES') return `ใบไม้ไม่พอ ขาดอีก ${d.missing} ใบ`
  if (d.reason === 'ALREADY_OWNED') return 'มีไอเท็มนี้แล้ว'
  if (d.reason === 'TIER_REQUIRED') return 'ต้องขยายห้องก่อนถึงจะซื้อชิ้นนี้ได้'
  if (String(err?.code).includes('not-found')) return 'ไม่พบไอเท็มนี้แล้ว'
  return 'ซื้อไม่สำเร็จ ลองใหม่อีกครั้ง'
}

// A refused placement (placement.js error code).
const PLACE_TEXT = {
  overlap: 'วางทับของอื่นไม่ได้',
  out_of_bounds: 'วางนอกห้องไม่ได้',
  off_grid: 'วางตรงนี้ไม่ได้',
  bad_slot: 'ของชิ้นนี้ต้องวางบนโต๊ะ',
  not_owned: 'ไม่มีของชิ้นนี้เหลือแล้ว',
  too_many: 'ห้องเต็มแล้ว เก็บของออกก่อน',
}
export const describePlaceError = (code) => PLACE_TEXT[code] ?? 'วางตรงนี้ไม่ได้'

export const TREE_LABELS = { sprout: 'ต้นอ่อน', shrub: 'พุ่มไม้', tree: 'ต้นไม้', blossom: 'ต้นไม้ดอก', withered: 'ต้นไม้เหี่ยว' }
