// Places the Warp sheet can send the player to. `needs`: null (always), 'map' (only when that
// map exists in this build) or 'account' (signed-in only; the School Hub then checks the school).
export const WARP_PLACES = [
  { id: 'room', labelTh: 'ห้องของฉัน', mapKey: 'room', needs: null },
  { id: 'campus', labelTh: 'งานเปิดบ้าน (Open House)', mapKey: 'campus', needs: 'map' },
  { id: 'hub', labelTh: 'โรงเรียน (School Hub)', mapKey: 'school_hub', needs: 'account' },
]

export const WARP_ERRORS = {
  NO_SCHOOL: 'เลือกโรงเรียนของคุณที่หน้าโซเชียลก่อน แล้วค่อยมาวาร์ปไปโรงเรียน',
  ROOM_FULL: 'ห้องเต็มชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่',
  FAILED: 'วาร์ปไม่สำเร็จ ลองใหม่อีกครั้ง',
  BUSY: 'กำลังโหลดแผนที่ รอสักครู่แล้วลองใหม่',
}

// Pure. `hasMap(mapKey)` says whether a map exists in this build.
export function availablePlaces({ hasMap, signedIn }) {
  return WARP_PLACES.filter((p) => {
    if (p.needs === 'map') return hasMap(p.mapKey)
    if (p.needs === 'account') return signedIn
    return true
  })
}
