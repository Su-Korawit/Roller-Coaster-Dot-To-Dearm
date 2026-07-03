# RC Assets Migration — ย้ายงาน custom จาก `sprites/` ไป `rc/` (ADR-0007 Phase 2)

**Date:** 2026-07-03
**Status:** approved (design), pending implementation
**Related:** `docs/adr/0007-rc-assets-folder-separation.md`

## Context

เฟส 1 เสร็จแล้ว (2026-07-03): push Sprout Lands official 450 ไฟล์ขึ้น Firebase Storage สำเร็จ
Storage ตอนนี้มี 489 ไฟล์ = 450 official + **39 ไฟล์ custom ที่ค้างอยู่ผิดที่**ใต้ `sprites/`
ไฟล์ทั้ง 39 ถูกโหลดโดยเกมจริงผ่าน `src/game/assetManifest.js` — ย้ายทันทีไม่ได้ ต้อง
copy → repoint → verify → delete ตามลำดับ เพื่อไม่ให้เกมพังระหว่างทาง

รายการ 39 ไฟล์ (จาก storage diff report, ทั้งหมด verdict = `orphan`, ไม่มี `diverged`,
ไม่มี path ชนกับ official 450 ไฟล์):

- `sprites/characters/{ENFJ…ISTP}.png` — MBTI spritesheets, 16 ไฟล์
- `sprites/tilesets/*.png` — 16 ไฟล์ (Grass, Water, Hills, Fences, Office,
  Tilled_Dirt ×4, Wooden_House ×3, UiversityV1, fence_school ×3)
- `sprites/objects/*.png` — 7 ไฟล์ (Basic_Furniture, Basic_Grass_Biom_things,
  Basic_Grass_Biom_things_1, Basic_Plants, Chest, Shop4, Wood_Bridge)

## Decision

ย้ายทั้ง 39 ไฟล์แบบ byte-identical ไป `rc/` โดย mirror โครงสร้างเดิม:

| จาก | ไป |
|---|---|
| `sprites/characters/X.png` | `rc/characters/X.png` |
| `sprites/tilesets/X.png` | `rc/tilesets/X.png` |
| `sprites/objects/X.png` | `rc/objects/X.png` |

`rc/objects/` เป็น folder ใหม่ที่ ADR-0007 ยังไม่ได้ระบุ → อัปเดต ADR-0007 เพิ่ม
`objects/` เข้า layout ด้วย

**Non-goal (YAGNI):** ไฟล์บางตัว (Grass, Basic_Plants ฯลฯ) เป็น Sprout Lands
เวอร์ชันเก่า — การ re-point ไปหา official pack ใหม่ต้องเช็ค frame layout ทีละไฟล์
เลื่อนออกไปเป็นงานอนาคต ตอนนี้เกมโหลดไฟล์เดิมเป๊ะ ๆ จาก `rc/` เท่านั้น

## ลำดับการทำงาน (เกมต้องไม่พังทุกจุด)

1. **Copy** — script copy 39 ไฟล์ → `rc/` พร้อม verify md5 หลัง copy
   (Storage มี 2 ชุดชั่วคราว เกมยังใช้ชุดเก่า) — ใช้ Node + firebase-admin
   รันจากเครื่อง owner แบบเดียวกับ pushToFirebase.mjs
2. **Repoint** — แก้ `src/game/assetManifest.js`: `storagePath` ของ MBTI 16,
   tileset 11, object 4, crops 1 → path `rc/...` (localPath fallback คงเดิม)
   และแก้ `scripts/uploadAssets.mjs` ให้อัปโหลดขึ้น `rc/` path ตรงกัน
   **รวมถึง audit จุดอ้างอิงอื่น:** `src/utils/mapConfig.js`,
   `src/utils/resolveTilesets*`, `src/components/admin/MapConfigEditor.jsx`
   และเอกสาร map config ใน Firestore — ทุกที่ที่เก็บ/สร้าง path
   `sprites/tilesets/...` ต้องรองรับหรือ migrate เป็น `rc/tilesets/...`
3. **Verify** — `npm test` ผ่าน + เปิดเกม (`npm run dev`) ตรวจว่า Phaser โหลด
   sprite จาก `rc/` ได้จริง (network tab เห็น request ไป `rc/...`)
4. **Delete** — ลบ 39 ไฟล์เก่าออกจาก `sprites/` (เฉพาะ 39 path ที่ระบุชัด
   ไม่ใช้ wildcard) — ทำหลัง verify ผ่านเท่านั้น
5. **Confirm clean** — รัน storage diff report อีกครั้ง ต้องได้
   `Storage is clean — no orphan or diverged files`

## Error handling

- Copy ขั้นที่ 1: verify md5 ทุกไฟล์หลัง copy; mismatch → หยุด รายงาน ไม่ไปต่อ
- ขั้น 4 ลบเฉพาะเมื่อไฟล์ปลายทาง `rc/` มี md5 ตรงกับต้นทาง ณ เวลานั้น
- ทุก script พิมพ์รายงานสรุป (moved/failed) และเขียน audit JSON

## Consequences

- ADR-0007 สมบูรณ์: `sprites/`, `ui/`, `audio/` เหลือ official ล้วน
- Artist กด Update Assets ได้ไฟล์สะอาด ไม่มี custom ปน
- งาน custom ทั้งหมดอยู่ `rc/` ที่ sync script ไม่มีวันแตะ
- `maps/` prefix (test3.json, indoor.json) อยู่นอก scope งานนี้ — ADR-0007
  พูดถึง `rc/maps/` แต่ `maps/` ไม่ถูก sync ทับ จึงไม่เร่ง
