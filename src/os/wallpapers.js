// Wallpapers: Soft Pixel gradients (the fallback) plus pixel-art images, grouped in collections.
// `dark` tells the UI to use light text. `video: true` means a looping clip exists next to the
// images (see wallpaperVideo); leave it off until the .mp4 files are in public/assets/os/wallpapers.
export const WALLPAPER_CATEGORIES = [
  { id: 'classic', name: 'คลาสสิก' },
  { id: 'eu', name: 'EU' },
  { id: 'na', name: 'USA & Canada' },
]

export const WALLPAPERS = [
  { id: 'lavender', category: 'classic', name: 'ลาเวนเดอร์', dark: false, css: 'linear-gradient(160deg, #EFEBFA 0%, #D9D5EA 55%, #C9C0E8 100%)' },
  { id: 'sky', category: 'classic', name: 'ท้องฟ้า', dark: false, css: 'linear-gradient(180deg, #E1F3FB 0%, #F4F3F9 70%, #FFFFFF 100%)' },
  { id: 'mint', category: 'classic', name: 'มิ้นต์', dark: false, css: 'linear-gradient(160deg, #E7F4EB 0%, #BFE3CB 100%)' },
  { id: 'sunset', category: 'classic', name: 'พระอาทิตย์ตก', dark: false, css: 'linear-gradient(160deg, #FCF2E2 0%, #F6C9C4 55%, #E58BC0 100%)' },
  { id: 'night', category: 'classic', name: 'กลางคืน', dark: true, css: 'linear-gradient(160deg, #463c74 0%, #2B2550 100%)' },

  // EU
  { id: 'eu-alps', category: 'eu', name: 'เทือกเขาแอลป์', dark: false, css: 'linear-gradient(180deg, #CFE8F7 0%, #EAF4F2 55%, #BFE0C8 100%)' },
  { id: 'eu-canal', category: 'eu', name: 'เมืองริมคลอง', dark: false, css: 'linear-gradient(170deg, #FCEBD2 0%, #F2C9B8 55%, #9FC6D9 100%)' },
  { id: 'eu-tuscany', category: 'eu', name: 'ทุ่งทัสคานี', dark: false, css: 'linear-gradient(170deg, #FFF1C9 0%, #E9D58E 55%, #A8C97F 100%)' },
  { id: 'eu-aurora', category: 'eu', name: 'แสงเหนือนอร์ดิก', dark: true, css: 'linear-gradient(170deg, #1F3A5C 0%, #2F6A6B 50%, #3B2F6E 100%)' },

  // USA & Canada
  { id: 'na-canyon', category: 'na', name: 'หุบเขาทะเลทราย', dark: false, css: 'linear-gradient(170deg, #FBE3C4 0%, #EBA672 55%, #B8614A 100%)' },
  { id: 'na-lake', category: 'na', name: 'ทะเลสาบป่าสน', dark: false, css: 'linear-gradient(170deg, #D6EEF2 0%, #9FD0C4 55%, #4F8A73 100%)' },
  { id: 'na-skyline', category: 'na', name: 'เมืองใหญ่ยามเย็น', dark: true, css: 'linear-gradient(170deg, #3A2F6E 0%, #8A4A7E 55%, #E58B6F 100%)' },
  { id: 'na-autumn', category: 'na', name: 'ใบไม้เปลี่ยนสี', dark: false, css: 'linear-gradient(170deg, #FFE9C2 0%, #F2B263 55%, #C4573A 100%)' },
]

export const DEFAULT_WALLPAPER = 'lavender'

export const wallpapersIn = (categoryId) => WALLPAPERS.filter((w) => w.category === categoryId)

// Pixel-art images (ChatGPT work orders 005 / 018): one per orientation so every screen shape gets a
// native crop. Missing files fall back to the gradient above.
export function wallpaperImage(id, orientation) {
  return `/assets/os/wallpapers/${id}-${orientation}.webp`
}

// Looping clip of the same scene; shown over the image once it can play through.
export function wallpaperVideo(id, orientation) {
  return `/assets/os/wallpapers/${id}-${orientation}.mp4`
}

export function getWallpaper(id) {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]
}
