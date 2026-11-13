# 020 — โลโก้และภาพ splash แอป Checklist

ทุกภาพสไตล์ Soft Pixel (อ้างอิง ai-handoff/STYLE.md) ต้นฉบับ ไม่เลียนแบบงานหรือแบรนด์ใด ไม่มีตัวอักษร/ตัวเลข/โลโก้ในภาพ

| ภาพ | ใช้ที่ | ขนาด/สัดส่วน | พื้นหลัง | ไฟล์ต้นฉบับ | ไฟล์ในโปรเจกต์ |
|---|---|---|---|---|---|
| โลโก้แอป | ไอคอนบนหน้า Home / Store | 1:1 (สร้าง 1024 ย่อเป็น 256) | เต็มช่อง ไม่โปร่งใส | from-chatgpt/020-checklist-logo.png | public/assets/os/apps/checklist.webp |
| ภาพปก (key art) หน้า Load | splash ตอนเปิดแอป | 5:2 (สร้าง 1536x1024 แล้วครอปเป็น 1440x576) | เต็มช่อง | from-chatgpt/020-checklist-splash.png | public/assets/os/splash/checklist.webp |

## พรอมต์ 1: โลโก้
Soft pixel-art app icon, square 1:1, full-bleed (no transparency, no rounded-corner mask needed). A cute clipboard with three green check marks and short purple text lines, a purple clip at the top, resting on a soft sky-blue background with a small green hill at the bottom. Chunky visible pixels, limited pastel palette (cream, purple, green, sky blue, a touch of pink), thick dark-indigo outline. NO text, NO letters, NO numbers, NO logos, NO watermark. Original design, not imitating any existing game or brand.

## พรอมต์ 2: ภาพปก splash
Soft pixel-art key art, wide landscape 3:2, original scene. A cozy study desk by a window at golden hour seen from the side: a big clipboard with a long checklist where most boxes are ticked green, a small stack of exam-prep books, a mug, and a little paper trophy. Left third of the image is calm and low-detail (soft sky and wall) so text can be placed over it later. Chunky visible pixels, pastel palette (cream, purple, green, sky blue, pink accents), thick dark-indigo outlines. NO text, NO letters, NO numbers, NO logos, NO watermark, NO real brands, NO existing characters.

## ตรวจก่อนใช้
- ไม่มีตัวอักษรหรือโลโก้ในภาพ, ขนาด/สัดส่วนตรง, ฝั่งซ้ายของ splash โล่งพอวางข้อความ
- แปลงเป็น webp (โลโก้ ~256px, splash 1440x576) ขนาดไฟล์ไม่ใหญ่เกินไป
- ตอนนี้ในโค้ดใช้ภาพพิกเซลชั่วคราวที่สร้างด้วย scripts/makeChecklistArt.mjs ไฟล์ปลายทางชื่อเดียวกัน วางทับได้เลย
