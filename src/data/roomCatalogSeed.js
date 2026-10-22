// Initial Study Room catalog (Firestore `roomCatalog`, seeded by scripts/seedRoomCatalog.mjs).
// Prices are tuned later from Admin → Rooms without a deploy. Item `spriteKey` names a row
// in the generated `room_items` atlas (drawable kinds only: furniture, decor, desk, wall); pets,
// accessories, tiers and themes have their own art. Items with a row keep their order: new
// drawable items go after the last one.
const item = (name, kind, price, footprint = [1, 1], extra = {}) => ({
  name, kind, price, footprint, spriteKey: extra.spriteKey, frames: extra.frames ?? 1, tierMin: 0,
  ...(extra.deskSlot ? { deskSlot: true } : {}),
  ...(extra.requires ? { requires: extra.requires } : {}),
  ...(extra.slot ? { slot: extra.slot } : {}),
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
  make('pet_bed', 'เบาะนอนสัตว์เลี้ยง', 'decor', 150, [1, 1]),
  make('trophy_shelf', 'ชั้นโชว์ถ้วยต้นไม้', 'furniture', 300, [1, 1]),
  make('theme_minimal', 'ธีมมินิมอล', 'theme', 0, [1, 1]),
  make('theme_library_wood', 'ธีมห้องสมุดไม้', 'theme', 1500, [1, 1]),
  make('theme_cafe', 'ธีมคาเฟ่', 'theme', 1500, [1, 1]),
  make('theme_night_sky', 'ธีมท้องฟ้ายามค่ำ', 'theme', 1500, [1, 1]),
  make('tier_1', 'ห้องใหญ่ขึ้น', 'tier', 1200, [1, 1]),
  make('tier_2', 'ระเบียงริมทะเลสาบ', 'tier', 3000, [1, 1], { requires: 'tier_1' }),
  make('tier_3', 'ห้องที่สอง', 'tier', 6000, [1, 1], { requires: 'tier_2' }),
  make('pet_cat_orange', 'แมวสีส้ม', 'pet', 600, [1, 1]),
  make('pet_cat_black', 'แมวสีดำ', 'pet', 600, [1, 1]),
  make('pet_shiba', 'ชิบะ', 'pet', 600, [1, 1]),
  make('pet_bunny', 'กระต่าย', 'pet', 600, [1, 1]),
  make('acc_cap', 'หมวกแก๊ป', 'accessory', 250, [1, 1], { slot: 'head' }),
  make('acc_ribbon', 'ริบบิ้นผม', 'accessory', 300, [1, 1], { slot: 'head' }),
  make('acc_glasses', 'แว่นตากลม', 'accessory', 250, [1, 1], { slot: 'face' }),
  make('acc_mask', 'หน้ากากแมว', 'accessory', 300, [1, 1], { slot: 'face' }),
  make('acc_scarf', 'ผ้าพันคอ', 'accessory', 350, [1, 1], { slot: 'neck' }),
  make('acc_bowtie', 'โบว์ไทด์', 'accessory', 300, [1, 1], { slot: 'neck' }),
  make('acc_backpack', 'กระเป๋าเป้', 'accessory', 400, [1, 1], { slot: 'back' }),
  make('acc_wings', 'ปีกนางฟ้า', 'accessory', 500, [1, 1], { slot: 'back' }),
])

// What every account gets from `claimWelcomePack` (alongside 100 Leaves).
export const STARTER_ITEMS = {
  desk_basic: 1, chair_basic: 1, bed_basic: 1, bookshelf_basic: 1,
  lamp_desk: 1, plant_small: 1, rug_round: 1, theme_minimal: 1,
}
