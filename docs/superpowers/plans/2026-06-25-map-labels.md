# Map Labels (Floating Text) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow map authors to place Insert Point objects in a Tiled `Labels` object layer; the game renders each point's `text` property as floating text on the map at all times.

**Architecture:** Two-layer change — (1) `tiledMapMeta.js` parses the new `Labels` object layer into a `labels` array; (2) `worldScenes.js` consumes that array to create Phaser text objects in both normal gameplay and admin preview mode. The doc guide gets a new section so map authors know how to author the layer in Tiled.

**Tech Stack:** Phaser 3 (`this.add.text`), Vitest (tests), Tiled map JSON format.

## Global Constraints

- `Labels` layer name is exact and case-sensitive — the parser matches by that string only.
- Default `color` for a label with no `color` property is `#000000` (black).
- Labels with an empty or absent `text` property are silently ignored.
- Text depth in normal gameplay: `6` (above decorations at depth 5, below player at depth 10).
- Text depth in admin preview: `22` (above spawn pins at depth 21).
- Font size follows the player-label convention: `8 * mapScale` px with `stroke: '#ffffff'`, `strokeThickness: 1`.
- Text origin: `(0.5, 1)` — the bottom-center of the text sits at the point coordinate, so the text "floats above" the point.
- Labels are static — rendered once in `create()`, not updated each frame.
- `useUserStore.coins` and the PromptPay shop are never touched.
- All assets load from Firebase Storage via `cloudAsset()` — this feature adds no new assets.

---

## File Map

| File | Change |
|------|--------|
| `src/utils/tiledMapMeta.js` | Add `labelsFrom()` + `labels` field in `parseMapMeta()` return |
| `src/utils/tiledMapMeta.test.js` | Add two test cases for `Labels` parsing |
| `src/game/worldScenes.js` | Store `this._labels`, add `_renderLabels(mapScale, depth)`, call in both code paths |
| `src/data/mapDocs/tiled-guide.md` | Add "วิธีสร้าง Labels" section |

---

## Task 1 — Parse `Labels` layer in `tiledMapMeta.js`

**Files:**
- Modify: `src/utils/tiledMapMeta.js`
- Test: `src/utils/tiledMapMeta.test.js`

**Interfaces:**
- Produces: `parseMapMeta(map).labels` — `Array<{ x: number, y: number, text: string, color: string }>` (empty array when `Labels` layer absent; objects with empty/absent `text` are filtered out)

---

- [ ] **Step 1: Write the failing tests**

Open `src/utils/tiledMapMeta.test.js` and append this describe block at the end of the file (after the closing `}` of `'parseMapMeta farm extensions'`):

```js
describe('parseMapMeta labels', () => {
  it('parses Labels points with text and optional color', () => {
    const map = {
      width: 2, height: 2, tilesets: [], layers: [
        {
          name: 'Labels', type: 'objectgroup', objects: [
            { x: 64, y: 32, properties: [{ name: 'text', value: 'ร้านค้า' }, { name: 'color', value: '#ff0000' }] },
            { x: 128, y: 96, properties: [{ name: 'text', value: 'ทางออก' }] },
          ],
        },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.labels).toEqual([
      { x: 64, y: 32, text: 'ร้านค้า', color: '#ff0000' },
      { x: 128, y: 96, text: 'ทางออก', color: '#000000' },
    ])
  })

  it('returns empty labels when the layer is absent', () => {
    const m = parseMapMeta({ width: 2, height: 2, tilesets: [], layers: [] })
    expect(m.labels).toEqual([])
  })

  it('filters out objects with empty or absent text', () => {
    const map = {
      width: 2, height: 2, tilesets: [], layers: [
        {
          name: 'Labels', type: 'objectgroup', objects: [
            { x: 10, y: 10, properties: [{ name: 'text', value: '' }] },
            { x: 20, y: 20, properties: [] },
            { x: 30, y: 30, properties: [{ name: 'text', value: 'ฟาร์ม' }] },
          ],
        },
      ],
    }
    const m = parseMapMeta(map)
    expect(m.labels).toEqual([
      { x: 30, y: 30, text: 'ฟาร์ม', color: '#000000' },
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test src/utils/tiledMapMeta.test.js
```

Expected: 3 failures — `m.labels` is `undefined`.

- [ ] **Step 3: Implement `labelsFrom()` and add to `parseMapMeta`**

In `src/utils/tiledMapMeta.js`, add the `labelsFrom` function immediately after `interactionsFrom` (around line 37, before `export function parseMapMeta`):

```js
function labelsFrom(map) {
  const layer = objectLayer(map, 'Labels')
  return (layer?.objects || [])
    .map((o) => ({
      x: o.x,
      y: o.y,
      text: propValue(o, 'text') ?? '',
      color: propValue(o, 'color') ?? '#000000',
    }))
    .filter((l) => l.text !== '')
}
```

Then in `parseMapMeta`, add `labels` to the return object (after `interactions`):

```js
  return {
    width: map.width,
    height: map.height,
    tilesetNames,
    spawns,
    defaultSpawnName,
    portals,
    farmTiles: farmTilesFrom(map),
    interactions: interactionsFrom(map),
    labels: labelsFrom(map),
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test src/utils/tiledMapMeta.test.js
```

Expected: all tests PASS (including the 3 pre-existing describe blocks).

- [ ] **Step 5: Commit**

```
git add src/utils/tiledMapMeta.js src/utils/tiledMapMeta.test.js
git commit -m "feat: parse Labels object layer in tiledMapMeta"
```

---

## Task 2 — Render labels in `worldScenes.js` + update `tiled-guide.md`

**Files:**
- Modify: `src/game/worldScenes.js`
- Modify: `src/data/mapDocs/tiled-guide.md`

**Interfaces:**
- Consumes: `meta.labels` — `Array<{ x, y, text, color }>` from Task 1

No unit tests — Phaser scenes cannot be unit tested. Manual verification instructions are in Step 5.

---

- [ ] **Step 1: Store `this._labels` in `create()`**

In `src/game/worldScenes.js`, find the block that stores farm/interaction meta (around line 291–292):

```js
this._farmTiles = meta.farmTiles ?? new Set()
this._interactions = meta.interactions ?? []
```

Add one line after:

```js
this._farmTiles = meta.farmTiles ?? new Set()
this._interactions = meta.interactions ?? []
this._labels = meta.labels ?? []
```

- [ ] **Step 2: Add `_renderLabels(mapScale, depth)` method**

In `src/game/worldScenes.js`, add this method to the `MapScene` class, right after the `_renderCrops` method (around line 739):

```js
  _renderLabels(mapScale, depth = 6) {
    (this._labels ?? []).forEach((lb) => {
      const txt = this.add.text(lb.x * mapScale, lb.y * mapScale, lb.text, {
        fontSize: `${8 * mapScale}px`,
        color: lb.color,
        stroke: '#ffffff',
        strokeThickness: 1,
      })
      txt.setDepth(depth)
      txt.setOrigin(0.5, 1)
    })
  }
```

- [ ] **Step 3: Call `_renderLabels` in normal (non-preview) `create()` path**

In `src/game/worldScenes.js`, find the `_renderDecorations` call in the non-preview path (around line 346):

```js
this._decorGroup = this.add.group()
this._mapScale = mapScale
this._renderDecorations(mapScale)
```

Add one line after `_renderDecorations`:

```js
this._decorGroup = this.add.group()
this._mapScale = mapScale
this._renderDecorations(mapScale)
this._renderLabels(mapScale)
```

- [ ] **Step 4: Render labels in preview path**

In `src/game/worldScenes.js`, find the preview block that draws portal rects (around line 316–323). It ends just before the camera fit:

```js
      rect.setDepth(20)
    })
    // Fit camera to map (cover — no black borders)
    const fitZoom = Math.max(
```

Insert label rendering between the portal loop and the camera fit:

```js
      rect.setDepth(20)
    })
    // Draw label text (admin preview)
    meta.labels.forEach((lb) => {
      const txt = this.add.text(lb.x * mapScale, lb.y * mapScale, lb.text, {
        fontSize: `${8 * mapScale}px`,
        color: lb.color,
        stroke: '#ffffff',
        strokeThickness: 1,
      })
      txt.setDepth(22)
      txt.setOrigin(0.5, 1)
    })
    // Fit camera to map (cover — no black borders)
    const fitZoom = Math.max(
```

- [ ] **Step 5: Manual verification**

Start the dev server:
```
npm run dev
```

Open a map in the game. In Tiled, add a `Labels` Object Layer to any `.json` map, insert two points:
- Point A: `text = "ร้านค้า"`, `color = "#cc0000"`
- Point B: `text = "ทางออก"` (no color property)

Export and upload the map. Confirm:
- Point A renders red text "ร้านค้า" floating above the point coordinate.
- Point B renders black text "ทางออก" (default color) floating above the point coordinate.
- In Admin Dashboard map preview, both labels are also visible.
- Walking around or interacting does not affect label rendering.

- [ ] **Step 6: Update `tiled-guide.md`**

In `src/data/mapDocs/tiled-guide.md`, append the following section at the end of the file (after the last line):

```markdown
---

## วิธีสร้าง Labels (ข้อความลอยบนแมพ)

Labels คือข้อความที่แสดงลอยอยู่บนแมพตลอดเวลา เช่น ชื่อโซน ป้ายบอกทาง หรือคำอธิบาย

### ขั้นตอน

1. สร้าง **Object Layer** ชื่อ `Labels`
2. เลือก **Insert Point tool (I)** แล้วคลิกตำแหน่งที่ต้องการให้ข้อความปรากฏ
3. เพิ่ม **Custom Property** สำหรับข้อความ:

| Property | Type   | ต้องมีไหม | คำอธิบาย |
|----------|--------|-----------|----------|
| `text`   | string | **required** | ข้อความที่แสดง เช่น `"ร้านค้า"`, `"ทางออก"` |
| `color`  | string | optional  | สีข้อความใน hex เช่น `#cc0000` (default: `#000000`) |

> ข้อความจะแสดงแบบ bottom-center ที่พิกัดของ point — เหมือน "ลอยเหนือ" จุดที่วาง
>
> Object ที่ไม่มี `text` property หรือ `text` เป็นค่าว่างจะถูกข้ามโดยอัตโนมัติ
>
> ข้อความจะแสดงทั้งในเกมปกติและในหน้า Preview ของ Admin Dashboard
```

- [ ] **Step 7: Commit**

```
git add src/game/worldScenes.js src/data/mapDocs/tiled-guide.md
git commit -m "feat: render Labels layer as floating text on map"
```
