# คู่มือการสร้างแมพด้วย Tiled

คู่มือนี้อธิบายวิธีสร้างและอัปโหลดแมพเข้าระบบ ตั้งแต่การสร้าง layers ใน Tiled จนถึงการกำหนดค่าใน Dashboard

---

## Layers ที่ต้องมี

| Layer name   | ประเภท      | หมายเหตุ                                                  |
|--------------|-------------|-----------------------------------------------------------|
| `Ground`     | Tile Layer  | พื้นดินหลัก วาดทุก cell                                   |
| `FarmGround` | Tile Layer  | **ดินไถสำหรับปลูก — ยืดหยุ่น: วาด tile ตรงไหน ผู้เล่นปลูกตรงนั้นได้** ไม่มีโซนตายตัว เว้นว่างถ้าไม่ใช่แมพฟาร์ม |
| `Plants`     | Tile Layer  | **พืช/พุ่มไม้ตกแต่งแบบ static เท่านั้น** — พืชที่ผู้เล่นปลูกเกม render ให้เองแบบ dynamic ไม่ต้องวาดที่นี่ |
| `Objects`    | Tile Layer  | สิ่งของ เฟอร์นิเจอร์ ต้นไม้ — วาดบนพื้น (รวมรูปร้านค้า/หีบ ถ้ามี)  |
| `Collision`  | Tile Layer  | พื้นที่ชน (invisible) — กำหนดใน Dashboard ว่า layer ไหน block |
| `Spawns`     | Object Layer | จุด spawn ของผู้เล่น — ดูวิธีสร้างด้านล่าง               |
| `Portals`    | Object Layer | ทางออก/เข้าแมพ (เปลี่ยนแมพ) — ดูวิธีสร้างด้านล่าง        |
| `Interactions` | Object Layer | *(ไม่บังคับ)* โซน action ในแมพ: ร้านค้า / หีบเก็บของ — ดูวิธีสร้างด้านล่าง |

> ชื่อ layer ต้องตรงทุกตัวอักษร (case-sensitive). ลำดับ layer ใน Tiled จะกำหนดลำดับการ render
>
> **แมพฟาร์มต้องมี `FarmGround`** (ปลูกได้ตรงที่มีดินไถ). พืชที่ปลูก ร้านค้า และหีบ ทำงานเฉพาะในแมพที่มี layer ที่เกี่ยวข้องเท่านั้น

---

## วิธีสร้างแมพใหม่ใน Tiled

### 1. สร้าง Map

```
File > New > New Map
Orientation: Orthogonal
Tile layer format: CSV
Tile render order: Right Down
Map size: Fixed (กำหนดขนาดตามต้องการ เช่น 30×20)
Tile size: 32×32 px
```

### 2. เพิ่ม Tileset

```
Map > Add External Tileset...
```

เลือกไฟล์ `.tsx` หรือสร้างใหม่ผ่าน Tilesets panel
- Tileset name ต้องตรงกับชื่อไฟล์ที่อัปโหลดใน Storage
- ระบบจะ auto-match tileset name กับไฟล์ใน `sprites/tilesets/` และ `sprites/objects/`

### 3. วาด Tile Layers

สร้าง layer แต่ละชั้นตาม required layers ด้านบน เลือก layer แล้ววาดด้วย Stamp tool (B)

---

## วิธีสร้าง Spawns

Spawns คือจุดที่ผู้เล่นปรากฏตัวเมื่อเข้าแมพ (หรือมาจาก portal)

### ขั้นตอน

1. สร้าง **Object Layer** ชื่อ `Spawns`
2. เลือก Insert Point tool (I) แล้วคลิกตำแหน่ง spawn บนแมพ
3. ตั้งชื่อ object เช่น `main`, `north`, `entrance`
4. สำหรับ spawn หลัก: เพิ่ม **Custom Property**
   - Type: `bool`
   - Name: `default`
   - Value: `true`

> แมพต้องมีอย่างน้อย 1 spawn ที่มี property `default = true` มิฉะนั้นระบบจะเตือน

### ตัวอย่าง Object Properties (Spawns)

| Property  | Type   | Value  |
|-----------|--------|--------|
| `default` | bool   | `true` |

---

## วิธีสร้าง Portals

Portals คือพื้นที่สี่เหลี่ยมที่เมื่อผู้เล่นเดินเข้าไปจะถูกพาไปยังแมพอื่น

### ขั้นตอน

1. สร้าง **Object Layer** ชื่อ `Portals`
2. เลือก Insert Rectangle tool (R) แล้ววาด rect บริเวณทางออก
3. เพิ่ม **Custom Properties** สองรายการ:

| Property      | Type   | คำอธิบาย                               |
|---------------|--------|----------------------------------------|
| `target`      | string | key ของแมพปลายทาง เช่น `town`, `cave` |
| `targetSpawn` | string | ชื่อ spawn ในแมพปลายทาง เช่น `south`  |

> ใช้ Object Layer แทน Tile Layer เพื่อประสิทธิภาพ — ระบบตรวจสอบ overlap กับ rect ของผู้เล่น 1 ครั้งต่อ frame แทนการอ่านทุก tile

> **แมพฟาร์มต้องเข้าถึงได้:** อย่าลืมเพิ่ม Portal ใน**แมพหลัก** (`map`) ที่ `target` ชี้มาแมพฟาร์ม (`test2`) ด้วย — ไม่งั้นผู้เล่นออกจากฟาร์มได้แต่เข้าไม่ได้

---

## วิธีสร้าง Interactions (ร้านค้า / หีบเก็บของ)

Interactions คือพื้นที่สี่เหลี่ยมที่เมื่อผู้เล่นเดินเข้าไปจะเปิด UI ในแมพ (ไม่เปลี่ยนแมพเหมือน Portal)

### ขั้นตอน

1. สร้าง **Object Layer** ชื่อ `Interactions`
2. เลือก Insert Rectangle tool (R) แล้ววาด rect ทับบริเวณรูปร้านค้า/หีบ (ที่วาดไว้ใน `Objects`)
3. เพิ่ม **Custom Property** `action` เพื่อบอกประเภท:

**ร้านค้า:**

| Property | Type   | Value                          |
|----------|--------|--------------------------------|
| `action` | string | `shop`                         |
| `shopId` | string | id ร้านใน ShopData เช่น `seed_shop` |

**หีบเก็บของ:**

| Property | Type   | Value   |
|----------|--------|---------|
| `action` | string | `chest` |

> เดินเข้าโซน `shop` → เปิดหน้าร้าน (ซื้อ/ขาย); เดินเข้าโซน `chest` → เปิดคลังเก็บของ; เดินออก → ปิดเอง
>
> ความแตกต่างจาก Portals: Portals มี property `target` (เปลี่ยนแมพ), Interactions มี property `action` (action ในแมพ) — ระบบแยกประเภทจาก property ที่ใส่

---

## ขั้นตอนอัปโหลดแมพ

### 1. Export จาก Tiled

```
File > Export As > JSON map files (.json)
```

เลือก Embed tilesets: **ปิด** (ไม่ embed) เพื่อให้ไฟล์เล็ก

### 2. อัปโหลดใน Dashboard

1. ไปที่ **Admin > Maps**
2. คลิก **อัปโหลดแมพใหม่**
3. เลือกไฟล์ `.json` และตั้งชื่อแมพ
4. ระบบจะ **auto-match tilesets** — ถ้าชื่อ tileset ตรงกับไฟล์ใน Storage จะจับคู่อัตโนมัติ
5. ถ้ามี tileset ที่ยังไม่มีในระบบ: ระบบจะแจ้ง error — อัปโหลดไฟล์ PNG ผ่าน **ตั้งค่า > Assets** ก่อน แล้วลองใหม่

### 3. ตั้งค่าหลังอัปโหลด

คลิก **ตั้งค่า** ที่แมพที่เพิ่งอัปโหลด:

- **ชื่อแสดงผล** — ชื่อที่แสดงในเกม
- **Default Spawn** — เลือก spawn ที่ผู้เล่นเริ่มต้น
- **Capabilities** — เปิด/ปิด multiplayer, editable, entry map
- **Tilesets** — ตรวจสอบและแก้ไข path ที่ match แล้ว

---

## เคล็ดลับและข้อควรระวัง

- **ชื่อ layer ต้องตรงทุกตัวอักษร** — ระบบ parse ด้วย exact name match
- **Tileset name = ชื่อไฟล์ PNG** — เช่น tileset ชื่อ `dungeon_tiles` ต้องมีไฟล์ `dungeon_tiles.png` ใน `sprites/tilesets/`
- **Portal rect ต้องไม่เล็กเกินไป** — ควรคลุม tile อย่างน้อย 1 ช่อง (32×32 px)
- **Spawn point วาง tile กลาง** — ตำแหน่ง x,y ของ point จะเป็นจุดที่ผู้เล่นยืน
- **map key จะสร้างจากชื่อที่ตั้ง** — ตัวพิมพ์เล็ก ไม่มีช่องว่าง เช่น "ทุ่งหญ้า" → `thugnha`
