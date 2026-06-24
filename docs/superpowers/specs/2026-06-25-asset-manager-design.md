# Asset Manager — Design Spec
_Date: 2026-06-25_

## Problem

ตอน upload map ใหม่ใน `MapDashboard` ระบบเรียก `autoMatchTilesets` ซึ่ง hardcode scan แค่ `sprites/tilesets/` กับ `sprites/objects/` เท่านั้น ถ้า map ใหม่ใช้ tileset ที่ยังไม่มีใน Storage จะขึ้น error บล็อกการ upload ทันที เพราะไม่มีหน้าจัดการ asset แยกต่างหาก

## Goal

เพิ่ม tab **"Assets"** ใน Admin Dashboard ที่ให้ admin จัดการ asset ใน Firebase Storage ได้อย่างอิสระก่อน upload map — สร้าง/rename/ลบ folder, upload/rename/move/ลบไฟล์ — และ auto-match ใน map upload จะ scan ทุก folder ที่ลงทะเบียนไว้โดยอัตโนมัติ

---

## Architecture

### Approach: Firestore folder registry + Storage files

Firestore เก็บ folder metadata, Storage เก็บไฟล์จริง — ตรงกับ pattern ที่ project ใช้อยู่แล้ว (เช่น `mapConfigs` collection)

---

## Data Model

### Firestore — `assetFolders` collection

```js
// assetFolders/{folderId}
{
  path: "sprites/tilesets",    // Storage path prefix (no trailing slash)
  displayName: "Tilesets",
  isSystem: true,              // true = ลบ/rename ไม่ได้
  order: 0,                    // sort order ใน sidebar
  createdAt: serverTimestamp(),
  trashedAt: null,             // non-null = soft-deleted folder
  createdBy: uid,
}
```

**System folders** (seed อัตโนมัติตอนเปิดหน้า Assets ครั้งแรก):
- `sprites/tilesets` — displayName "Tilesets", isSystem: true, order: 0
- `sprites/objects` — displayName "Objects", isSystem: true, order: 1

### Firebase Storage structure

```
sprites/
  tilesets/          ← system folder
  objects/           ← system folder
  dungeon/           ← user-created example
  custom_pack/       ← user-created example
trash/
  sprites/tilesets/OldGrass.png   ← soft-deleted ไฟล์ เก็บ path โครงสร้างเดิม
  sprites/dungeon/Rock.png
```

`trash/` prefix ไม่ถูก scan โดย auto-match เด็ดขาด

---

## UI Layout

### Tab ใหม่ใน AdminPage

เพิ่ม `{ id: 'assets', label: 'Assets' }` ใน `ALL_TABS` (AdminPage.jsx) และ `'assets'` ใน section list ของ admin ที่มีสิทธิ์ (constants/admin.js)

### Two-panel layout

```
┌─────────────────────────────────────────────────────────┐
│  Assets                              [+ สร้าง Folder]   │
├────────────────────┬────────────────────────────────────┤
│                    │  sprites/tilesets/                  │
│ 📁 Tilesets  (sys) │  [⬆ Upload]  [🔍 ค้นหา...]        │
│ 📁 Objects   (sys) │                                     │
│ 📁 Dungeon         │  ┌──────┐  ┌──────┐  ┌──────┐     │
│   ✏ 🗑             │  │▪▪▪▪▪│  │▪▪▪▪▪│  │▪▪▪▪▪│     │
│                    │  │Grass │  │Water │  │Hills │     │
│ ──────────────     │  └──────┘  └──────┘  └──────┘     │
│ 🗑 Trash  (3)      │   [···]     [···]     [···]        │
└────────────────────┴────────────────────────────────────┘
```

### Folder sidebar (ซ้าย)
- แสดง folders จาก `assetFolders` (ยกเว้น trashedAt non-null)
- System folder: badge `sys`, ไม่มีปุ่ม rename/delete
- User folder: ปุ่ม `✏ rename` และ `🗑 delete` inline
- "Trash" เป็น virtual entry พิเศษ อยู่ล่างสุดเสมอ — แสดงจำนวนไฟล์ใน `trash/`

### File grid (ขวา)
- List ไฟล์จาก Storage ตาม folder ที่เลือก (`listAll`)
- ภาพ: thumbnail preview (pixelated), `.json`: icon text
- แต่ละ card มีปุ่ม `···` dropdown menu: **Rename / Move to / Delete**
- Trash panel: แสดงไฟล์ใน `trash/` พร้อมปุ่ม **Restore** และ **ลบถาวร**
- ด้านล่าง Trash: ปุ่ม **"ล้าง Trash ทั้งหมด"** (permanent delete ทุกอย่างใน trash) — มี confirmation

---

## File Operations

| Operation | Flow |
|---|---|
| **Upload** | `uploadBytesResumable` → `sprites/<folder>/<filename>` → `bustCache` |
| **Rename** | copy ไป path ใหม่ → `bustCache` ทั้ง 2 path → delete เดิม |
| **Move** | copy ไป `sprites/<target-folder>/<filename>` → delete เดิม → reload grid |
| **Soft-delete** | copy ไป `trash/<original-path>` → delete เดิม → `bustCache` |
| **Restore** | copy จาก `trash/<path>` กลับ original path → delete trash copy → `bustCache` |
| **Permanent delete** | `deleteObject` ตรงๆ (เฉพาะไฟล์ใน Trash เท่านั้น) |

---

## Folder Operations

| Operation | Flow |
|---|---|
| **Create** | write doc ใหม่ใน `assetFolders` → เลือก folder นั้นทันที (Storage folder เกิดขึ้นเองเมื่อ upload ไฟล์แรก) |
| **Rename** | update Firestore `path` + `displayName` ก่อน → `listAll` ไฟล์ใน old path → copy ทีละไฟล์ไป new path → delete originals → `bustCache` → แสดง progress `กำลังย้ายไฟล์ 3/7...` |
| **Soft-delete folder** | แสดง confirmation + จำนวนไฟล์ → `listAll` → copy ทุกไฟล์ไป `trash/<original-path>` → delete originals → set `trashedAt` ใน Firestore |

### UX Safeguards
- **Rename folder**: แสดง progress inline (`กำลังย้ายไฟล์ 3/7...`) เพราะเป็น multi-step
- **Delete folder**: confirmation dialog แสดงจำนวนไฟล์ที่จะถูกย้ายไป Trash ก่อนยืนยัน
- **System folders** (`tilesets`, `objects`): disable rename/delete ทุก action ที่ UI
- **Trash**: ปุ่ม "ล้าง Trash" permanent delete แยกต่างหาก พร้อม confirmation

---

## Auto-match Integration

### ก่อน (hardcoded)
```js
// MapDashboard.jsx — UploadPanel
const [tilesetsResult, objectsResult] = await Promise.all([
  listAll(ref(storage, 'sprites/tilesets')).catch(() => ({ items: [] })),
  listAll(ref(storage, 'sprites/objects')).catch(() => ({ items: [] })),
])
const storagePaths = [
  ...tilesetsResult.items.map((i) => i.fullPath),
  ...objectsResult.items.map((i) => i.fullPath),
]
```

### หลัง (dynamic จาก Firestore)
```js
// MapDashboard.jsx — UploadPanel
const folders = await listAssetFolders()  // non-trashed จาก assetFolders collection
const storagePaths = (await Promise.all(
  folders.map(f => listAll(ref(storage, f.path)).catch(() => ({ items: [] })))
)).flatMap(r => r.items.map(i => i.fullPath))
```

`autoMatchTilesets` ใน `resolveTilesets.js` ไม่ต้องแก้ — interface ไม่เปลี่ยน

---

## New Files

| ไฟล์ | หน้าที่ |
|---|---|
| `src/components/admin/AssetsManagerSection.jsx` | Main section + FolderSidebar + FileGrid components |
| `src/components/admin/FolderPickerModal.jsx` | Modal เลือก folder ปลายทางสำหรับ "Move to" (ต่างจาก StorageBrowser ที่เลือกไฟล์) |
| `src/utils/assetFolders.js` | Firestore CRUD: `listAssetFolders`, `createFolder`, `renameFolder`, `trashFolder`, `seedSystemFolders` |
| `src/utils/storageOps.js` | Storage helpers: `copyStorageObject` (extract จาก AssetsSection), `moveFile`, `trashFile`, `restoreFile` |

## Modified Files

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `src/pages/AdminPage.jsx` | เพิ่ม `{ id: 'assets', label: 'Assets' }` ใน ALL_TABS + import AssetsManagerSection |
| `src/constants/admin.js` | เพิ่ม `'assets'` ใน section list ของ admin ที่มีสิทธิ์ |
| `src/components/admin/MapDashboard.jsx` | `UploadPanel`: เปลี่ยน hardcoded folder list → `listAssetFolders()` |
| `src/components/admin/AssetsSection.jsx` | ลบ `copyStorageObject` (ย้ายไป `storageOps.js`) → import จากที่ใหม่ |

---

## Out of Scope

- Restore folder ทั้ง folder จาก Trash (restore ทีละไฟล์เท่านั้น ใน v1)
- Permission per folder (ทุก admin เห็นและแก้ได้หมด)
- ขนาด / quota tracking
- Firestore Security Rules สำหรับ `assetFolders` — ใช้ rules เดิมของ project (admin-only write) โดยไม่แก้ rules ใน spec นี้
