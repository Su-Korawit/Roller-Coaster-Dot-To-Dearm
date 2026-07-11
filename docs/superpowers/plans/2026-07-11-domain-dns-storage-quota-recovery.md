# Domain DNS + Storage Quota Recovery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** กู้โดเมน `ilovetcas.com` (ตอนนี้ตายทั้ง zone), ทำให้เกมไม่ crash เมื่อ Firebase Storage โควต้าเต็ม, และปิดงาน subdomain ที่ค้าง

**Architecture:** ปัญหาแบ่งเป็น 2 ชั้น — (A) ops/console: DNS zone ไม่ถูก provision บน Vercel, Storage โควต้าเต็ม (402 ทั้ง project), Vercel env `VITE_FIREBASE_DATABASE_URL` ชี้ region ผิด; (B) code hardening ให้ Cursor: เกม crash แข็ง ๆ เมื่อ cloud asset ล่ม เพราะ fallback path ชี้ไฟล์ที่ไม่มีจริง (Vercel catch-all เสิร์ฟ `app.html` กลับมาเป็น JSON) และ Phaser ได้ URL เป็น `null`

**Tech Stack:** Vercel CLI 54, Firebase Storage SDK, Phaser 3.90, React, Vitest

## หลักฐาน root cause (ตรวจแล้ว 2026-07-11)

1. **Domain ตายทั้ง zone (SERVFAIL ทุก resolver):**
   - Registry `.com` delegate ไป `ns1/ns2.vercel-dns.com` แล้ว (owner เปลี่ยน NS ที่ GoDaddy ตาม OWNER-TODO ทาง A)
   - แต่ `nslookup ilovetcas.com ns1.vercel-dns.com` → **Query refused** — Vercel ไม่ได้ provision zone
   - `vercel domains inspect ilovetcas.com` → `Intended Nameservers: -` พร้อม ☓ และ warning "Set `A ilovetcas.com 76.76.21.21`"
   - `vercel dns ls ilovetcas.com` → **0 records**
   - ผล: ทุก host (apex, www, ทุก subdomain) NXDOMAIN/SERVFAIL — regression จากเมื่อวานที่ www ยังใช้ได้ (ตอนนั้น DNS ยังอยู่ GoDaddy)
2. **Firebase Storage 402 ทั้ง project:** `GET https://firebasestorage.googleapis.com/v0/b/rollercoasterdottodream.firebasestorage.app/o/maps%2Ftest3.json?alt=media` → **402 Payment Required** (โควต้า no-cost เต็ม) — เกมโหลด asset ไม่ได้บนทุก host
3. **Crash chain ในเกม** (`worldScenes.js`): map `test2` เป็น map ที่ upload ขึ้น Storage อย่างเดียว — `public/maps/` มีแค่ `indoor.json` + `test3.json` → fallback `/maps/test2.json` โดน Vercel catch-all rewrite เสิร์ฟ `app.html` → `JSON.parse` เจอ `<!doctype` พัง; tileset `Shop4` (`rc/…`) ไม่มี local copy → `this.load.image('Shop4', null)` → Phaser throw "URL Error in File: Shop4 from: null"
4. **RTDB region warning:** local `.env` ถูกแล้ว (`asia-southeast1`) แต่ Vercel env `VITE_FIREBASE_DATABASE_URL` (อายุ 44 วัน) ยังเป็น `…-default-rtdb.firebaseio.com` ตัวเก่า

## Global Constraints

- No TypeScript — plain JS + JSX เท่านั้น
- Firebase paths ผ่าน `src/lib/db.js` เท่านั้น (งานนี้ไม่แตะ Firestore)
- Vercel เสิร์ฟไฟล์จริงก่อน rewrites — ห้ามสร้าง `dist/index.html` (SPA shell คือ `app.html`)
- Vercel project: `rollercoaster`, scope `ikkyusanstudys-projects-f4dc6e94`; Firebase project: `rollercoastewrdottodream` → ใช้ `--project rollercoasterdottodream` เสมอ
- ห้ามแตะ `serviceAccountKey.json`

---

# Part A — Ops (Owner ทำใน console / Claude Code รันเมื่อได้รับอนุมัติ) ⚠️ ทำก่อน Part B

> Part A ไม่ใช่งาน Cursor — Cursor ข้ามไป Part B ได้เลย

### Task A1: กู้ DNS zone บน Vercel (ด่วนสุด — เว็บตายทั้งโดเมนอยู่)

NS delegate มา Vercel แล้ว แต่ zone ว่างเปล่า/ไม่ active ต้องทำให้ Vercel DNS ตอบ query ให้ได้

- [x] **Step 1 (ลองทาง CLI ก่อน):** สร้าง record แรกเพื่อบังคับ provision zone

```bash
npx vercel dns add ilovetcas.com '@' A 76.76.21.21 --scope ikkyusanstudys-projects-f4dc6e94
npx vercel dns add ilovetcas.com www CNAME cname.vercel-dns.com --scope ikkyusanstudys-projects-f4dc6e94
```

> **ผลจริง (2026-07-11):** CLI ทำไม่ได้ทุกทาง — `dns add` / `dns import` ตอบ "ilovetcas.com is not a DNS zone (400)",
> `domains add` ตอบ alias_conflict ปลอม ๆ (โดเมนอยู่กับ `rollercoaster` ครบอยู่แล้ว ตรวจจาก `alias ls`)
> → zone provisioning ต้องกดใน dashboard (Step 3) เท่านั้น

- [ ] **Step 2: ตรวจว่า zone ตอบแล้ว**

```powershell
nslookup -type=A ilovetcas.com ns1.vercel-dns.com
```

Expected: ได้ answer `76.76.21.21` (ไม่ใช่ "Query refused") — propagation resolver สาธารณะอาจตามมาช้าสุด ~1 ชม. เพราะ SERVFAIL ถูก negative-cache

- [ ] **Step 3 (ถ้า Step 1–2 ไม่ผ่าน — Query refused เหมือนเดิม):** Owner เปิด Vercel dashboard → team `ikkyusanstudys-projects` → **Domains** tab → `ilovetcas.com` → ดูสถานะ verification; ถ้ามีปุ่ม "Enable Vercel DNS" / "Verify" ให้กด; ถ้ายังไม่หาย ให้ลบโดเมนออกจาก team แล้ว add ใหม่ (project attachments `ilovetcas.com`, `www`, `*.ilovetcas.com` ต้อง add กลับด้วย)

- [ ] **Step 4 (ทางหนีไฟ ถ้า Vercel DNS ไม่ยอมทำงานใน 1 วัน):** ย้าย DNS กลับ GoDaddy — Change nameservers กลับเป็น GoDaddy default แล้วตั้ง records เอง:
  - `A @ → 76.76.21.21`
  - `CNAME www → cname.vercel-dns.com`
  - `CNAME app / roadmap / tcas / news / school → cname.vercel-dns.com` (5 รายการ)
  - ข้อเสีย: wildcard `*.ilovetcas.com` บน Vercel ต้องใช้ Vercel NS — ทางนี้ต้อง add subdomain รายตัวใน Vercel → Settings → Domains แทน

- [ ] **Step 5: ตรวจครบทุก host**

```powershell
foreach ($h in 'ilovetcas.com','www.ilovetcas.com','app.ilovetcas.com','roadmap.ilovetcas.com','tcas.ilovetcas.com','news.ilovetcas.com','school.ilovetcas.com') { try { Invoke-WebRequest -Uri "https://$h/" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 | ForEach-Object { "$h -> $($_.StatusCode)" } } catch { "$h -> $($_.Exception.Response.StatusCode.value__)" } }
```

Expected: apex/www = 200 (hub prerender), subdomain = 200 หรือ 308 ตาม config — ไม่มี DNS error

### Task A2: แก้ Firebase Storage โควต้าเต็ม (402) — ✅ เสร็จ 2026-07-11 (owner อัปเกรด Blaze แล้ว ตรวจซ้ำได้ 200)

- [x] **Step 1:** Owner เปิด Firebase Console → project `rollercoasterdottodream` → **Storage → Usage** ดูว่าโควต้าตัวไหนเต็ม (download bandwidth น่าจะใช่ — 402 ตอบทั้ง project)
- [ ] **Step 2 (แนะนำ):** อัปเกรดเป็น **Blaze plan** + ตั้ง budget alert ใน Google Cloud Billing (เช่น เตือนที่ $5/$10) — โควต้า no-cost จะกลับมาใช้ได้ทันทีและมี headroom
- [ ] **Step 3 (ถ้ายังไม่พร้อมจ่าย):** รอโควต้ารีเซ็ต (รายวัน) — ระหว่างนี้เกมจะยังพังจนกว่า Part B จะ deploy (Part B ทำให้ degrade อย่างสุภาพแทน crash)
- [ ] **Step 4: ตรวจ**

```powershell
Invoke-WebRequest -Uri 'https://firebasestorage.googleapis.com/v0/b/rollercoasterdottodream.firebasestorage.app/o/maps%2Ftest3.json?alt=media' -UseBasicParsing | Select-Object StatusCode
```

Expected: 200

> **หมายเหตุลด bandwidth ระยะยาว (ยังไม่ทำในแผนนี้ — ต้องตัดสินใจก่อนเพราะขัด ADR-0003 cloud-first):** asset ส่วนใหญ่ (Sprout Lands sprites, MBTI sheets) มี copy ใน `public/` อยู่แล้ว — สลับให้ local-first จะตัด Storage egress เกือบหมด เหลือแค่ `rc/` + uploaded maps ถ้าโควต้าเต็มซ้ำอีก ให้เปิดหัวข้อนี้เป็นแผนใหม่

### Task A3: แก้ Vercel env `VITE_FIREBASE_DATABASE_URL` (RTDB region ผิด) — ✅ เสร็จ 2026-07-11 (production + preview แก้แล้ว, redeploy แล้ว; เคล็ด CLI: env add ฝั่ง preview ต้องส่ง branch เป็น `""`)

- [ ] **Step 1:** ลบค่าเก่าแล้วใส่ใหม่ (ทั้ง production + preview)

```bash
npx vercel env rm VITE_FIREBASE_DATABASE_URL production --yes --scope ikkyusanstudys-projects-f4dc6e94
npx vercel env rm VITE_FIREBASE_DATABASE_URL preview --yes --scope ikkyusanstudys-projects-f4dc6e94
echo "https://rollercoasterdottodream-default-rtdb.asia-southeast1.firebasedatabase.app" | npx vercel env add VITE_FIREBASE_DATABASE_URL production --scope ikkyusanstudys-projects-f4dc6e94
echo "https://rollercoasterdottodream-default-rtdb.asia-southeast1.firebasedatabase.app" | npx vercel env add VITE_FIREBASE_DATABASE_URL preview --scope ikkyusanstudys-projects-f4dc6e94
```

- [ ] **Step 2:** redeploy (push commit ใดก็ได้ขึ้น `main` หรือ `npx vercel redeploy <latest-prod-url> --scope …`)
- [ ] **Step 3: ตรวจ** — เปิดเว็บ prod → console ต้องไม่มี `FIREBASE WARNING: Database lives in a different region`

### Task A4: งาน console ที่เหลือหลัง DNS ฟื้น (จาก OWNER-TODO เดิม)

- [ ] Vercel → Settings → Domains: `ilovetcas.com` = primary, `www` redirect → apex (สลับทิศ 308)
- [ ] Firebase Console → Authentication → Authorized domains → add ทั้ง 7 hosts (`ilovetcas.com`, `www.`, `app.`, `roadmap.`, `tcas.`, `news.`, `school.`)
- [ ] Google Search Console: add Domain property + submit sitemaps
- [ ] บอก Claude Code รัน verification sweep ทุก host (h1 hub/landing, redirect เก่า, login popup บน subdomain, `*.vercel.app` ไม่เปลี่ยน)

---

# Part B — Code hardening (Cursor) — ทำได้ทันที ไม่ต้องรอ Part A

เป้าหมาย: เมื่อ Storage ล่ม/โควต้าเต็ม เกมต้อง **ไม่ crash** — map ที่มี local copy เล่นได้ต่อ, map cloud-only ขึ้น error screen สุภาพ + ปุ่ม retry, tileset ที่หายถูก skip พร้อม warn

### Task B1: `localMapPath()` helper ใน assetManifest

**Files:**
- Modify: `src/game/assetManifest.js` (ท้ายไฟล์ ใกล้ `GAME_ASSET_BY_KEY`)
- Test: `src/game/assetManifest.test.js` (สร้างใหม่)

**Interfaces:**
- Produces: `localMapPath(mapKey: string) -> string | null` — คืน path ใน `public/` เฉพาะ map ที่ ship มากับ repo (`test3`, `indoor`); map อื่น (uploaded) คืน `null`

- [ ] **Step 1: เขียน failing test**

```js
// src/game/assetManifest.test.js
import { describe, it, expect } from 'vitest'
import { localMapPath } from './assetManifest'

describe('localMapPath', () => {
  it('returns the public/ path for maps shipped with the repo', () => {
    expect(localMapPath('test3')).toBe('/maps/test3.json')
    expect(localMapPath('indoor')).toBe('/maps/indoor.json')
  })

  it('returns null for cloud-only (uploaded) maps', () => {
    expect(localMapPath('test2')).toBe(null)
  })

  it('returns null for non-map asset keys', () => {
    expect(localMapPath('Grass')).toBe(null)
  })
})
```

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/game/assetManifest.test.js` → Expected: FAIL (`localMapPath` is not exported)

- [ ] **Step 3: implement** — เพิ่มท้าย `src/game/assetManifest.js`:

```js
// Local public/ copy of a map JSON — only for maps shipped with the repo.
// Uploaded maps (Storage-only) return null; callers must NOT fabricate
// `/maps/<key>.json` for those — on prod the SPA catch-all rewrite would
// answer with app.html and JSON.parse blows up ("Unexpected token '<'").
export function localMapPath(mapKey) {
  const entry = GAME_ASSET_BY_KEY[mapKey]
  return entry?.type === 'tilemapJSON' ? entry.localPath : null
}
```

- [ ] **Step 4: รันให้ผ่าน** — `npx vitest run src/game/assetManifest.test.js` → Expected: PASS
- [ ] **Step 5: Commit** — `git add src/game/assetManifest.js src/game/assetManifest.test.js && git commit -m "feat(game): localMapPath helper - no fake local fallback for uploaded maps"`

### Task B2: worldScenes — เลิก fallback ปลอม + กัน null URL + กัน scene พังเงียบ

**Files:**
- Modify: `src/game/worldScenes.js:116-127` (loadSceneData), `:152-190` (preload), `:192-196` (create)

**Interfaces:**
- Consumes: `localMapPath(mapKey)` จาก Task B1
- Produces: `loadSceneData(mapKey)` **throw** `Error('map-unavailable:<mapKey>')` เมื่อไม่มีทั้ง cloud URL และ local copy; game event ใหม่ `mapLoadFailed` `{ mapKey }` เมื่อ tilemap ไม่อยู่ใน cache ตอน create (Task B3 ใช้ทั้งคู่)

- [ ] **Step 1:** import helper — บรรทัด 4 เปลี่ยนเป็น:

```js
import { MBTI_TYPES, GAME_ASSETS, GAME_ASSET_BY_KEY, localMapPath } from './assetManifest'
```

- [ ] **Step 2:** `loadSceneData` (บรรทัด 125-126) เปลี่ยนเป็น:

```js
  const mapJsonUrl = await cloudAsset(`maps/${mapKey}.json`, { fallback: localMapPath(mapKey) })
  if (!mapJsonUrl) throw new Error(`map-unavailable:${mapKey}`)
  return { assetUrls: { ...assetUrls, [mapKey]: mapJsonUrl }, mapConfig, tilesetUrls }
```

- [ ] **Step 3:** `preload()` — แก้ 2 จุด

จุดแรก (บรรทัด 160-161) ใช้ helper แทน path ปลอม:

```js
    localByKey[this.mapKey] = { local: localMapPath(this.mapKey), kind: 'tilemap' }
    const mapUrl = urlFor(r, this.mapKey) ?? localMapPath(this.mapKey)
    if (mapUrl) this.load.tilemapTiledJSON(this.mapKey, mapUrl)
```

จุดสอง (บรรทัด 163-167) skip tileset ที่ไม่มี URL แทนที่จะยัด `null` ให้ Phaser throw:

```js
    const tiles = r.get('tilesetUrls') ?? {}
    Object.entries(tiles).forEach(([name, { url, local }]) => {
      if (!url) {
        console.warn(`[MapScene] tileset "${name}" unavailable (no cloud URL, no local copy) — skipped`)
        return
      }
      localByKey[name] = { local, kind: 'image' }
      this.load.image(name, url)
    })
```

- [ ] **Step 4:** `create()` — กันเคส tilemap โหลดไม่สำเร็จ (เช่น Storage คืน error กลางทาง) เพิ่มเป็นบรรทัดแรกสุดของ `create()` (ก่อน `const map = this.make.tilemap(…)` บรรทัด 193):

```js
    if (!this.cache.tilemap.exists(this.mapKey)) {
      this.game.events.emit('mapLoadFailed', { mapKey: this.mapKey })
      return
    }
```

- [ ] **Step 5: ตรวจว่า unit tests เดิมไม่พัง** — `npx vitest run` → Expected: PASS ทั้งหมด
- [ ] **Step 6: ตรวจด้วยมือใน dev** — `npx vite --port 5199 --strictPort` → เปิด `http://localhost:5199/home` → เกม boot ปกติ (Storage อาจยัง 402 — ต้องเห็น warn/skip ใน console แทน crash "URL Error in File")
- [ ] **Step 7: Commit** — `git add src/game/worldScenes.js && git commit -m "fix(game): survive storage outage - skip null tilesets, no fake map fallback, mapLoadFailed event"`

### Task B3: GameCanvas — error screen + retry แทนจอค้าง/จอดำ

**Files:**
- Modify: `src/components/GameCanvas.jsx` (state ~บรรทัด 58, listener ใน `bootGame` ~บรรทัด 181, boot catch ~บรรทัด 240, JSX overlay ~บรรทัด 374)

**Interfaces:**
- Consumes: `loadSceneData` throw + event `mapLoadFailed` จาก Task B2

- [ ] **Step 1:** เพิ่ม state ใต้ `isSwitchingMap` (บรรทัด 59):

```js
  const [bootError, setBootError] = useState(false)
```

- [ ] **Step 2:** ใน `bootGame` ถัดจาก listener `mapSceneReady` (บรรทัด 181-184) เพิ่ม:

```js
      game.events.on('mapLoadFailed', ({ mapKey }) => {
        console.error('[GameCanvas] map load failed:', mapKey)
        setIsBooting(false)
        setIsSwitchingMap(false)
        setBootError(true)
      })
```

- [ ] **Step 3:** boot catch (บรรทัด 240-243) เปลี่ยนเป็น:

```js
    })().catch((e) => {
      console.error('[GameCanvas] boot failed:', e)
      setIsBooting(false)
      setBootError(true)
    })
```

- [ ] **Step 4:** JSX — เพิ่ม overlay ก่อน block `{isBooting && (…)}` (บรรทัด 374) โดยใช้โทนเดียวกับ loading overlay เดิม:

```jsx
      {bootError && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
          style={{ background: 'linear-gradient(160deg, #0f0824 0%, #1a1035 50%, #0d1f3c 100%)' }}
        >
          <span className="text-5xl" aria-hidden="true">🛠️</span>
          <span className="pixel-font text-[10px] text-purple-300 text-center leading-relaxed px-8">
            โหลดแผนที่ไม่สำเร็จ — เซิร์ฟเวอร์ asset อาจไม่พร้อมใช้งานชั่วคราว
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="pixel-font text-[10px] px-4 py-2 rounded border border-purple-400/50 text-purple-200 hover:bg-purple-400/10"
          >
            ลองใหม่
          </button>
        </div>
      )}
```

และแก้เงื่อนไข loading overlay เป็น `{isBooting && !bootError && (`

- [ ] **Step 5: ตรวจด้วยมือ** — dev server เดิม: (1) เกมปกติ boot ได้ ไม่เห็น error screen; (2) จำลองพัง — DevTools → Network → block request pattern `firebasestorage.googleapis.com` + ตั้ง entry map เป็น map cloud-only (หรือแก้ `pickEntryKey` ชั่วคราวเป็น `'test2'`) → ต้องเห็น error screen + ปุ่มลองใหม่ ไม่ใช่จอโหลดค้าง — อย่าลืม revert ของชั่วคราว
- [ ] **Step 6: Commit** — `git add src/components/GameCanvas.jsx && git commit -m "feat(game): boot error screen with retry instead of silent crash"`

### Task B4: admin map loaders — อย่า parse HTML เป็น JSON

**Files:**
- Modify: `src/components/admin/MapInfoScreen.jsx:15-25` (`loadMapJson`), `src/components/admin/MapConfigEditor.jsx:13-24` (`loadMapText`), `src/components/admin/MapPreview.jsx:13`

**Interfaces:**
- Consumes: `localMapPath(key)` จาก Task B1

- [ ] **Step 1:** `MapInfoScreen.jsx` — แทน `loadMapJson` ทั้งฟังก์ชัน:

```js
import { localMapPath } from '../../game/assetManifest'

// Fetch map JSON from Storage, falling back to local public/ copy (repo-shipped
// maps only — uploaded maps have no local copy; never fetch a fabricated
// /maps/<key>.json, the SPA catch-all answers it with HTML).
async function loadMapJson(key) {
  const local = localMapPath(key)
  const url = await cloudAsset(`maps/${key}.json`, { fallback: local })
  for (const candidate of [url, local]) {
    if (!candidate) continue
    try {
      const res = await fetch(candidate)
      if (res.ok) return await res.json()
    } catch { /* try next candidate */ }
  }
  return null
}
```

- [ ] **Step 2:** `MapConfigEditor.jsx` — แทน `loadMapText` ทั้งฟังก์ชันด้วยแบบเดียวกัน (คืน text):

```js
import { localMapPath } from '../../game/assetManifest'

async function loadMapText(key) {
  const local = localMapPath(key)
  const url = await cloudAsset(`maps/${key}.json`, { fallback: local })
  for (const candidate of [url, local]) {
    if (!candidate) continue
    try {
      const res = await fetch(candidate)
      if (res.ok) {
        const text = await res.text()
        JSON.parse(text) // reject the SPA HTML shell masquerading as map JSON
        return text
      }
    } catch { /* try next candidate */ }
  }
  return ''
}
```

- [ ] **Step 3:** `MapPreview.jsx:13` — `loadSceneData` throw ได้แล้ว (Task B2) ต้องมี catch:

```js
    loadSceneData(mapKey)
      .then((data) => {
        // …ของเดิมทั้งหมดใน .then ไม่แตะ…
      })
      .catch((e) => console.error('[MapPreview] load failed:', e))
```

- [ ] **Step 4: ตรวจ** — `npx vitest run` ผ่าน + เปิด Admin → Maps ใน dev: map ที่มี local (test3/indoor) เปิด editor ได้; map cloud-only ตอนโควต้าเต็มต้องไม่ throw `Unexpected token '<'` (ได้ null/'' → UI ว่างอย่างสุภาพ)
- [ ] **Step 5: Commit** — `git add src/components/admin/MapInfoScreen.jsx src/components/admin/MapConfigEditor.jsx src/components/admin/MapPreview.jsx && git commit -m "fix(admin): map loaders stop parsing SPA HTML as map JSON"`

### Task B5 (optional): cloudAsset หยุดยิงซ้ำเมื่อโควต้าเต็ม

ตอนโควต้าเต็ม ทุก asset ยัง round-trip ไป Storage แล้วโดน 402 ทีละตัว (ช้า + spam console) — จำสถานะไว้ระดับ session แล้ว fallback ทันที

**Files:**
- Modify: `src/utils/cloudAsset.js`
- Test: `src/utils/cloudAsset.test.js` (มีอยู่แล้ว — เพิ่ม case)

- [ ] **Step 1: เขียน failing test** — เพิ่มใน `src/utils/cloudAsset.test.js` (ตามแพทเทิร์น mock เดิมของไฟล์ ซึ่ง mock `firebase/storage` อยู่แล้ว):

```js
  it('stops calling getDownloadURL for later paths after quota-exceeded', async () => {
    getDownloadURL.mockRejectedValueOnce({ code: 'storage/quota-exceeded' })
    await expect(cloudAsset('q/a.png', { fallback: '/a.png' })).resolves.toBe('/a.png')
    const callsAfterFirst = getDownloadURL.mock.calls.length
    await expect(cloudAsset('q/b.png', { fallback: '/b.png' })).resolves.toBe('/b.png')
    expect(getDownloadURL.mock.calls.length).toBe(callsAfterFirst) // no new round-trip
  })
```

(ชื่อ mock ให้ดูจากหัวไฟล์ test เดิม — ใช้ตัวเดียวกับ case `falls back on error` ที่มีอยู่)

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/utils/cloudAsset.test.js` → Expected: FAIL ที่ assertion สุดท้าย
- [ ] **Step 3: implement** — ใน `src/utils/cloudAsset.js` เพิ่ม module state + guard:

```js
// Once Storage answers quota-exceeded it will 402 every request until the
// quota resets — remember it for this session and fall back immediately
// instead of hammering the bucket once per asset.
let quotaExceeded = false

export function cloudAsset(path, { fallback = null } = {}) {
  if (!urlCache.has(path)) {
    const persisted = readPersisted(path)
    urlCache.set(
      path,
      persisted
        ? Promise.resolve(persisted)
        : quotaExceeded
          ? Promise.resolve(fallback)
          : getDownloadURL(ref(storage, path))
              .then((url) => {
                writePersisted(path, url)
                return url
              })
              .catch((err) => {
                if (err?.code === 'storage/quota-exceeded') quotaExceeded = true
                console.warn('[cloudAsset] falling back for', path, err?.code || err)
                return fallback
              }),
    )
  }
  return urlCache.get(path)
}
```

(ระวัง: ห้าม `writePersisted` ค่า fallback — โค้ดเดิมถูกอยู่แล้ว คงไว้)

- [ ] **Step 4: รันให้ผ่าน** — `npx vitest run src/utils/cloudAsset.test.js` → Expected: PASS ทุก case (เดิม + ใหม่)
- [ ] **Step 5: Commit** — `git add src/utils/cloudAsset.js src/utils/cloudAsset.test.js && git commit -m "perf(assets): remember quota-exceeded, fall back without round-trips"`

### Task B6: verify รวม + deploy

- [ ] `npx vitest run` → PASS ทั้งหมด
- [ ] `npm run build` → สำเร็จ, ไม่มี `dist/index.html` (ต้องเป็น `app.html`)
- [ ] Push `main` → Vercel auto-deploy → เปิด prod (host vercel.app ถ้า DNS ยังไม่ฟื้น): console ต้องไม่มี "URL Error in File" / "Unexpected token '<'" — ถ้าโควต้ายังเต็มต้องเห็น error screen "โหลดแผนที่ไม่สำเร็จ" หรือ map local เล่นได้
