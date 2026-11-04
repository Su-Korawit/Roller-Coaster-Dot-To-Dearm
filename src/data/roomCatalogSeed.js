// Initial Study Room catalog (Firestore `roomCatalog`, seeded by scripts/seedRoomCatalog.mjs).
// Prices are tuned later from Admin → Rooms without a deploy. Item `spriteKey` names a row
// in the generated `room_items` atlas. Tiers, pets and extra themes arrive with part 2.
const item = (name, kind, price, footprint = [1, 1], extra = {}) => ({
  name, kind, price, footprint, spriteKey: extra.spriteKey, frames: extra.frames ?? 1, tierMin: 0,
  ...(extra.deskSlot ? { deskSlot: true } : {}),
})

const make = (id, name, kind, price, footprint, extra = {}) => [id, item(name, kind, price, footprint, { spriteKey: id, ...extra })]

export const ROOM_CATALOG = Object.fromEntries([
  make('desk_basic', 'โต๊ะอ่านหนังสือ', 'desk', 150, [2, 1]),
  make('chair_basic', 'เก้าอี้', 'furniture', 90, [1, 1]),
  make('bed_basic', 'เตียง', 'furniture', 200, [2, 1]),
  make('bookshelf_basic', 'ชั้นหนังสือ', 'furniture', 160, [1, 1]),
  make('rug_round', 'พรมกลม', 'decor', 120, [2, 2]),
  make('poster_pastel', 'โปสเตอร์พาสเทล', 'wall', 80, [1, 1]),
  make('lamp_desk', 'โคมไฟตั้งโต๊ะ', 'decor', 90, [1, 1], { deskSlot: true, frames: 2 }),
  make('mug', 'แก้วกาแฟ', 'decor', 80, [1, 1], { deskSlot: true }),
  make('books_stack', 'กองหนังสือ', 'decor', 85, [1, 1], { deskSlot: true }),
  make('plant_small', 'ต้นไม้เล็ก', 'decor', 90, [1, 1], { deskSlot: true }),
  make('laptop', 'โน้ตบุ๊ก', 'decor', 400, [1, 1], { deskSlot: true }),
  make('theme_minimal', 'ธีมมินิมอล', 'theme', 0, [1, 1]),
])

// What every account gets from `claimWelcomePack` (alongside 100 Leaves).
export const STARTER_ITEMS = {
  desk_basic: 1, chair_basic: 1, bed_basic: 1, bookshelf_basic: 1,
  lamp_desk: 1, plant_small: 1, rug_round: 1, theme_minimal: 1,
}
