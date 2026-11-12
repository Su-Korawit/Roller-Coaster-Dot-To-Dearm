// Wallpapers: Soft Pixel gradients (the fallback) plus pixel-art images, grouped in collections.
// `dark` tells the UI to use light text. `video: true` means a looping clip exists next to the
// images (see wallpaperVideo); leave it off until the .mp4 files are in public/assets/os/wallpapers.
export const WALLPAPER_CATEGORIES = [
  { id: 'classic', name: 'คลาสสิก' },
  { id: 'eu', name: 'EU' },
  { id: 'na', name: 'USA & Canada' },
  { id: 'cn', name: 'จีน' },
  { id: 'kr', name: 'เกาหลี' },
  { id: 'jp', name: 'ญี่ปุ่น' },
]

// kind: 'country' (countryside / nature) or 'city'. The picker groups each collection by it.
export const WALLPAPER_KINDS = [
  { id: 'country', name: 'ชนบทและธรรมชาติ' },
  { id: 'city', name: 'เมือง' },
]

const g = (a, b, c) => `linear-gradient(170deg, ${a} 0%, ${b} 55%, ${c} 100%)`

export const WALLPAPERS = [
  { id: 'lavender', category: 'classic', kind: 'country', name: 'ลาเวนเดอร์', dark: false, css: 'linear-gradient(160deg, #EFEBFA 0%, #D9D5EA 55%, #C9C0E8 100%)' },
  { id: 'sky', category: 'classic', kind: 'country', name: 'ท้องฟ้า', dark: false, css: 'linear-gradient(180deg, #E1F3FB 0%, #F4F3F9 70%, #FFFFFF 100%)' },
  { id: 'mint', category: 'classic', kind: 'country', name: 'มิ้นต์', dark: false, css: 'linear-gradient(160deg, #E7F4EB 0%, #BFE3CB 100%)' },
  { id: 'sunset', category: 'classic', kind: 'country', name: 'พระอาทิตย์ตก', dark: false, css: 'linear-gradient(160deg, #FCF2E2 0%, #F6C9C4 55%, #E58BC0 100%)' },
  { id: 'night', category: 'classic', kind: 'country', name: 'กลางคืน', dark: true, css: 'linear-gradient(160deg, #463c74 0%, #2B2550 100%)' },

  // EU
  { id: 'eu-alps', category: 'eu', kind: 'country', name: 'เทือกเขาแอลป์', dark: false, css: g('#CFE8F7', '#EAF4F2', '#BFE0C8') },
  { id: 'eu-tuscany', category: 'eu', kind: 'country', name: 'ทุ่งทัสคานี', dark: false, css: g('#FFF1C9', '#E9D58E', '#A8C97F') },
  { id: 'eu-canal', category: 'eu', kind: 'city', name: 'เมืองริมคลอง', dark: false, css: g('#FCEBD2', '#F2C9B8', '#9FC6D9') },
  { id: 'eu-oldtown', category: 'eu', kind: 'city', name: 'เมืองเก่ายามค่ำ', dark: true, css: g('#1F2A55', '#4A3A78', '#C07A5A') },

  // USA & Canada
  { id: 'na-lake', category: 'na', kind: 'country', name: 'ทะเลสาบป่าสน', dark: false, css: g('#D6EEF2', '#9FD0C4', '#4F8A73') },
  { id: 'na-autumn', category: 'na', kind: 'country', name: 'ใบไม้เปลี่ยนสี', dark: false, css: g('#FFE9C2', '#F2B263', '#C4573A') },
  { id: 'na-harbor', category: 'na', kind: 'city', name: 'เมืองท่าริมอ่าว', dark: false, css: g('#DDEFFB', '#BFD8EA', '#6E9CC0') },
  { id: 'na-skyline', category: 'na', kind: 'city', name: 'เมืองใหญ่ยามเย็น', dark: true, css: g('#3A2F6E', '#8A4A7E', '#E58B6F') },

  // China
  { id: 'cn-karst', category: 'cn', kind: 'country', name: 'ภูเขาหินปูนริมแม่น้ำ', dark: false, css: g('#E3F1EC', '#BFE0CF', '#6FA58A') },
  { id: 'cn-terraces', category: 'cn', kind: 'country', name: 'นาขั้นบันได', dark: false, css: g('#F6F0CF', '#BFD98A', '#5E9A5B') },
  { id: 'cn-watertown', category: 'cn', kind: 'city', name: 'เมืองน้ำโบราณ', dark: false, css: g('#F7E4D2', '#E8B9A0', '#8FB3BE') },
  { id: 'cn-neon', category: 'cn', kind: 'city', name: 'มหานครยามค่ำ', dark: true, css: g('#1E1B4B', '#5B2A7E', '#D94F8A') },

  // Korea
  { id: 'kr-hanok', category: 'kr', kind: 'country', name: 'หมู่บ้านฮันอก', dark: false, css: g('#E6F2F7', '#F1E3C8', '#9CC59A') },
  { id: 'kr-jeju', category: 'kr', kind: 'country', name: 'ชายฝั่งเกาะเจจู', dark: false, css: g('#D5EEF7', '#9FD6D6', '#4E9A9A') },
  { id: 'kr-alley', category: 'kr', kind: 'city', name: 'ตรอกร้านค้า', dark: false, css: g('#FDE7DA', '#F2BFB4', '#B8A1D6') },
  { id: 'kr-seoul-night', category: 'kr', kind: 'city', name: 'โซลยามค่ำ', dark: true, css: g('#1B2150', '#40337C', '#C9558F') },

  // Japan
  { id: 'jp-fuji', category: 'jp', kind: 'country', name: 'ภูเขาไฟริมทะเลสาบ', dark: false, css: g('#DCEFFC', '#F6E6EC', '#9FC4E0') },
  { id: 'jp-sakura', category: 'jp', kind: 'country', name: 'หมู่บ้านซากุระ', dark: false, css: g('#FDEAF1', '#F6C6D8', '#9FD1A8') },
  { id: 'jp-kyoto', category: 'jp', kind: 'city', name: 'ถนนเมืองเก่า', dark: false, css: g('#FBE9D6', '#E9B98E', '#8C6E5A') },
  { id: 'jp-tokyo-night', category: 'jp', kind: 'city', name: 'โตเกียวยามค่ำ', dark: true, css: g('#16193F', '#4A2F7A', '#E0508A') },
]

export const DEFAULT_WALLPAPER = 'lavender'

export const wallpapersIn = (categoryId, kind) => WALLPAPERS.filter((w) => w.category === categoryId && (!kind || w.kind === kind))

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
