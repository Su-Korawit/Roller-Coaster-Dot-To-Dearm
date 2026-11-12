# 018 — วอลเปเปอร์ 5 คอลเลกชันประเทศ (EU, USA & Canada, จีน, เกาหลี, ญี่ปุ่น)

อ้างอิงสไตล์: `ai-handoff/STYLE.md` (Soft Pixel) และข้อกำหนดร่วมเดียวกับใบสั่ง 005
สถานะ: ทำเสร็จทั้ง 20 ธีม (40 ภาพนิ่ง) เมื่อ 2026-11-13 ผ่านโหมดเบราว์เซอร์ วิดีโอวนลูปยังไม่ได้ทำ

## แต่ละคอลเลกชัน = ชนบท/ธรรมชาติ 2 + เมือง 2
- EU: `eu-alps` `eu-tuscany` | `eu-canal` `eu-oldtown`(มืด)
- USA & Canada: `na-lake` `na-autumn` | `na-harbor` `na-skyline`(มืด)
- จีน: `cn-karst` `cn-terraces` | `cn-watertown` `cn-neon`(มืด)
- เกาหลี: `kr-hanok` `kr-jeju` | `kr-alley` `kr-seoul-night`(มืด)
- ญี่ปุ่น: `jp-fuji` `jp-sakura` | `jp-kyoto` `jp-tokyo-night`(มืด)

## ไฟล์
- ต้นฉบับ PNG: `ai-handoff/from-chatgpt/{id}-landscape.png` (~1672x941) และ `{id}-portrait.png` (~852x1846) — ไม่ commit (ใหญ่ ~80 MB)
- ใช้จริง: `public/assets/os/wallpapers/{id}-{landscape|portrait}.webp` (quality 82)

## ข้อกำหนดร่วม
พิกเซลอาร์ตอบอุ่น ขอบม่วงเข้ม ไม่ photoreal ของสวยอยู่ขอบล่างและมุมขวา กลางบน/ซ้ายบนโล่ง ไม่มีตัวอักษร ป้าย โลโก้ ตัวละคร แบรนด์ ลายตาราง
ฉากเมืองเป็นเมืองจินตนาการ ไม่ลอกอาคารจริง

## วิดีโอ (ยังไม่ทำ)
MP4 วนลูป 6-10 วินาที ไม่มีเสียง `{id}-{landscape|portrait}.mp4` แล้วตั้ง `video: true` ในรายการนั้นของ `src/os/wallpapers.js`
ตอนพิมพ์พรอมต์ช่องแชต ChatGPT เคยแทรกแท็บ "Hugging Face Video" เอง ให้ตรวจก่อนส่งทุกครั้ง
