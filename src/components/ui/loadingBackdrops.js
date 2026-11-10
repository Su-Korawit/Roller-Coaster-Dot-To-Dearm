// Pure helpers for the loading screen: which pixel backdrop and tip to show.
// The backdrops are the OS wallpapers (already cached after first visit). Future ads: flip
// LOADING_AD_ENABLED and render the ad inside <LoadingAdSlot> in LoadingScene.jsx.
export const LOADING_AD_ENABLED = false

export const LOADING_BACKDROPS = ['lavender', 'sky', 'mint', 'sunset', 'night']

export const LOADING_TIPS = [
  'วางแผนทีละนิด ดีกว่าอัดทีเดียวก่อนสอบ',
  'ลองกด Goal เพื่อดูปฏิทิน TCAS ของคุณ',
  'ลากไอคอนมาซ้อนกันเพื่อสร้างโฟลเดอร์ได้',
  'พักสายตาทุก 25 นาที สมองจะจำได้ดีขึ้น',
  'Habit ช่วยให้ไฟการเรียนไม่ดับ',
]

const pick = (list, n) => list[Math.abs(Math.floor(n)) % list.length]

export const backdropFor = (n) => pick(LOADING_BACKDROPS, n)
export const tipFor = (n) => pick(LOADING_TIPS, n)

// Portrait phones get the portrait art, everything else the landscape one.
export const backdropUrl = (name, portrait) => `/assets/os/wallpapers/${name}-${portrait ? 'portrait' : 'landscape'}.webp`
