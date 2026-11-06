// Wallpapers: Soft Pixel gradients (no image assets). `dark` tells the UI to use light text.
export const WALLPAPERS = [
  { id: 'lavender', name: 'ลาเวนเดอร์', dark: false, css: 'linear-gradient(160deg, #EFEBFA 0%, #D9D5EA 55%, #C9C0E8 100%)' },
  { id: 'sky', name: 'ท้องฟ้า', dark: false, css: 'linear-gradient(180deg, #E1F3FB 0%, #F4F3F9 70%, #FFFFFF 100%)' },
  { id: 'mint', name: 'มิ้นต์', dark: false, css: 'linear-gradient(160deg, #E7F4EB 0%, #BFE3CB 100%)' },
  { id: 'sunset', name: 'พระอาทิตย์ตก', dark: false, css: 'linear-gradient(160deg, #FCF2E2 0%, #F6C9C4 55%, #E58BC0 100%)' },
  { id: 'night', name: 'กลางคืน', dark: true, css: 'linear-gradient(160deg, #463c74 0%, #2B2550 100%)' },
]

export const DEFAULT_WALLPAPER = 'lavender'

// Pixel-art images (ChatGPT work order 005): one per orientation so every screen shape gets a
// native crop. Missing files fall back to the gradient above.
export function wallpaperImage(id, orientation) {
  return `/assets/os/wallpapers/${id}-${orientation}.webp`
}

export function getWallpaper(id) {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]
}
