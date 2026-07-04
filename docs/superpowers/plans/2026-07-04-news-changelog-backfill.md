# RollerCoaster News Changelog Backfill — Implementation Plan

> **For Cursor:** This plan is written for manual execution in Cursor per this repo's
> Claude Code ↔ Cursor split (CLAUDE.md). It edits one plain-JS data file — no
> subagent dispatch needed. Work top to bottom, run the checks after each task,
> commit in the two logical chunks marked below (per user's commit-in-stages
> preference).

**Goal:** Make the RollerCoaster tab of News (`NewsPanel.jsx`) reflect everything
shipped since the last changelog entry (`su-32`, dated 2026-06-18), including a
changelog entry dated today (2026-07-04).

**Architecture:** No new architecture. `STATIC_UPDATES` in
`src/data/appUpdates.js` is a hand-curated, hardcoded array (newest-first) merged
at render time with Firestore-backed admin updates via
`useNewsStore.getAllUpdates()` (`src/stores/useNewsStore.js:35-40`). This task
only appends new array entries in the same shape and prose style as the existing
32.

**Tech Stack:** Plain JS (no TypeScript), Vitest for the existing unit test.

## Global Constraints

- No TypeScript — plain JS/JSX only (per CLAUDE.md).
- Don't touch Firestore/Firebase — this is a static data file, no migration needed.
- Preserve existing array ordering convention: `STATIC_UPDATES` is sorted
  newest-first; `id` suffixes (`su-N`) increase with recency (`su-1` is oldest).
- Match the existing Thai copy voice/format exactly: short bold title, a one-line
  intro, then `\n\n` and `•`-bulleted highlights. Internal-only refactors get an
  explicit "(ไม่กระทบการใช้งาน)" qualifier, same as `su-32`.

---

## Investigation Findings (read before starting)

**Task 1 as originally phrased ("fix News so it can be dated today") turned up
no code defect.** I read `useNewsStore.js`, `NewsPanel.jsx`, and
`appUpdates.js`, and traced the date pipeline:

- Firestore-backed updates (added via the in-app admin form,
  `AddUpdateSheet` → `useNewsStore.addUpdate`) use `serverTimestamp()` — always
  "now", so admin-added entries already post with today's date correctly.
- Static entries sort via `new Date(u.date).getTime()`
  (`useNewsStore.js:38`) — a plain `'YYYY-MM-DD'` string parses fine for any
  date including today; there's no cutoff, cap, or validation blocking a
  same-day entry.
- `useNewsStore.test.js` already covers `getAllUpdates` merge/sort behavior and
  doesn't assume a fixed length, so appending entries won't break it.

**Conclusion:** there was nothing to "fix" in code. What was actually stale is
the *data* — no one had appended a changelog entry since `su-32` even though 10
days of shipped work piled up behind it (`git log --format='%ad' --date=short
a090786..HEAD | sort | uniq -c` shows commits spanning 2026-06-18 through
2026-07-04, the last commit-touching `appUpdates.js` being `a090786`). Task 1
is therefore satisfied as a side effect of Task 2: the newest appended entry
below is dated `2026-07-04` (today). If you still hit a case where a
same-day entry doesn't render/sort correctly, that's a **new** bug the
investigation above didn't predict — stop and diagnose it fresh rather than
assuming it matches this write-up.

**Scope call on Task 2:** `git log a090786..HEAD` returns ~253 commits. Most
are internal seam/refactor work already implicitly covered by grouping (this
mirrors how `su-32` itself bundled a dozen+ refactor commits into one entry).
I grouped the 253 commits by calendar day/theme into 10 new entries
(`su-33`..`su-42`) covering every *shippable* change. One cluster
(2026-06-26: `7120ce5`, `2e93e21`, `74645be` — ADR-numbering fix + a Cursor
rules doc addition) was deliberately **omitted** — it's process/docs-only,
nothing a player would notice, and every existing entry in the array
represents a user-visible or architecturally-notable change. If you disagree
with that omission, add an entry for it — the pattern below shows exactly how.

---

## Task 1: Append the 10 backfilled changelog entries

**Files:**
- Modify: `src/data/appUpdates.js:11-12` (insert new entries right after the
  opening `export const STATIC_UPDATES = [` line, i.e. *before* the existing
  `su-32` object, keeping newest-first order)

**Interfaces:**
- Consumes: nothing new — same `{ id, type, title, description, image, date }`
  shape every existing entry already uses; `type` must be one of
  `UPDATE_TYPES` (`new` / `update` / `fix`) defined at the top of the same file.
- Produces: `useNewsStore.getAllUpdates()` will include these automatically —
  no other file needs to change.

- [ ] **Step 1: Insert the 10 entries**

Open `src/data/appUpdates.js`. Right after this line:

```js
export const STATIC_UPDATES = [
```

paste the following 10 objects, **before** the existing `su-32` object (so the
array stays newest-first — `su-42` at the top, `su-32` immediately after
`su-42`):

```js
  {
    id: 'su-42',
    type: 'update',
    title: 'ปรับโครงสร้างภายใน Chat/Social/Task ต่อเนื่อง',
    description: 'ทยอยรวมการอ่าน/เขียนข้อมูลของ ChatPanel, SocialPanel, TaskPanel เข้า Store กลาง ต่อจากรอบที่แล้ว (ไม่กระทบการใช้งาน)\n\n• ย้ายการส่งของขวัญ/เครดิต, แชร์ Task, ข้อมูลโรงเรียนของ SocialPanel เข้า useChatStore/useSocialStore\n• เพิ่มแคชข้อมูลผู้ใช้ในแชท ลดการอ่านซ้ำจาก Firestore\n• ต่อ Storage ที่เหลือทั้งหมดผ่านจุดเดียว (storageOps / cloudAsset)',
    image: null,
    date: '2026-07-04',
  },
  {
    id: 'su-41',
    type: 'update',
    title: 'ปรับปรุงความเร็วแอปครั้งใหญ่ + ย้าย Asset ไปโฟลเดอร์ rc/',
    description: 'เน้นความเร็วในการโหลดแอปและจัดระเบียบไฟล์ภายใน (ไม่กระทบการใช้งาน)\n\n• แบ่งโหลดหน้าเกมและ Roadmap แบบ Lazy-load ลดเวลาเปิดแอปครั้งแรก\n• แคช URL รูปภาพไว้ในเครื่อง 24 ชม. ลดการเรียก Storage ซ้ำ\n• ลบไฟล์ mockup/สื่อที่ไม่ใช้แล้วกว่า 58MB ออกจากโปรเจกต์\n• ย้าย asset ของ RollerCoaster เองไปโฟลเดอร์ rc/ แยกจาก Sprout Lands ชัดเจนขึ้น',
    image: null,
    date: '2026-07-03',
  },
  {
    id: 'su-40',
    type: 'update',
    title: 'ปรับโครงสร้างหน้าเลือกข้อมูล (Career/University/Mastery ฯลฯ)',
    description: 'รวมโค้ดขั้นตอน "เลือก แล้ว sync ขึ้น Cloud" ของหน้า MBTI, สาขา, มหาวิทยาลัย, อาชีพ, Mastery ให้ใช้ตัวกลางร่วมกัน (ไม่กระทบการใช้งาน)\n\n• ลดโค้ดซ้ำซ้อนระหว่าง 5 หน้า Selection\n• เพิ่มชุดทดสอบตรวจสอบสิทธิ์แอดมิน (ADMIN_ROLES) ให้ตรงกับ Firestore/Storage rules เสมอ',
    image: null,
    date: '2026-07-02',
  },
  {
    id: 'su-39',
    type: 'fix',
    title: 'แก้การแจ้งเตือนในหน้าจัดการ Asset + สิทธิ์อ่านไฟล์เสียง/รูป',
    description: 'แก้ปัญหาเล็กน้อยในหน้าแอดมิน\n\n• แก้ Toast API ที่ใช้ผิดในหน้า UpdateAssetsSection ทำให้ข้อความแจ้งเตือนแสดงไม่ถูกต้อง\n• เปิดสิทธิ์อ่านสาธารณะสำหรับไฟล์ในโฟลเดอร์ ui/ และ audio/ ที่ทำให้บางรูป/เสียงโหลดไม่ขึ้น',
    image: null,
    date: '2026-07-01',
  },
  {
    id: 'su-38',
    type: 'new',
    title: 'Camphub — กรองค่าย/กิจกรรมแบบ 2 ระดับ',
    description: 'ปรับการกรองค่าย/กิจกรรมในแท็บ Camphub ให้ละเอียดขึ้น\n\n• เลือกหมวดหมู่หลักก่อน แล้วค่อยเลือกหมวดย่อยที่สนใจ\n• เพิ่มชุดหมวดหมู่ค่ายให้ครอบคลุมมากขึ้นทั้งฝั่ง API และหน้าแอป',
    image: null,
    date: '2026-06-30',
  },
  {
    id: 'su-37',
    type: 'new',
    title: 'ปรับระบบฟาร์มใหม่ทั้งระบบ + เพิ่ม Asset Manager',
    description: 'อัปเดตใหญ่ที่สุดรอบนี้ — ปรับฟาร์มและเพิ่มเครื่องมือจัดการไฟล์ให้แอดมิน\n\n• เปลี่ยนพืชจาก หัวผักกาด/แครอท/มันฝรั่ง/ฟักทอง → ข้าว และมะเขือเทศ พร้อมย้ายข้อมูลฟาร์มทั้งหมดขึ้น Firestore (แก้ไขได้จาก Admin โดยไม่ต้องแก้โค้ด)\n• เดินเข้าแปลงพร้อมถือเมล็ดในช่อง Hotbar เพื่อปลูกอัตโนมัติ ไม่ต้องกดปุ่มปลูกอีกต่อไป\n• เพิ่ม Asset Manager — จัดการโฟลเดอร์/ไฟล์ ลบเข้าถังขยะและกู้คืนได้\n• ย้าย Hotbar ไปแถบขวาแนวตั้ง และแสดงไอคอนทอง/เหรียญคู่กันที่ header',
    image: null,
    date: '2026-06-25',
  },
  {
    id: 'su-36',
    type: 'new',
    title: 'Map Dashboard — แอดมินอัปโหลด/พรีวิวแผนที่ Tiled ได้เอง',
    description: 'เพิ่มเครื่องมือแอดมินสำหรับจัดการแผนที่เกมทั้งหมด\n\n• อัปโหลดไฟล์แผนที่จาก Tiled พร้อมตรวจสอบความถูกต้องก่อนบันทึก\n• พรีวิวแผนที่พร้อมจุด Spawn/Portal แบบ real-time ก่อนใช้งานจริง\n• หน้าข้อมูลแผนที่ (spawn, tileset, ความสามารถ) และคู่มือสร้างแผนที่ในแอป\n• สลับแผนที่ผ่าน Portal ได้ลื่นไหลขึ้น',
    image: null,
    date: '2026-06-24',
  },
  {
    id: 'su-35',
    type: 'new',
    title: 'หน้า Welcome ใหม่ + ปุ่มควบคุมแบบ Joystick ล่องหน',
    description: 'เปิดตัวหน้า Landing Page (Welcome) สำหรับผู้เล่นใหม่ พร้อมระบบควบคุมเกมแบบใหม่\n\n• หน้าแรกเต็มจอพร้อมวิดีโอ Hero, ส่วน Stats/รีวิว/FAQ/บริจาค (PromptPay) — แก้ไขเนื้อหาได้จาก Admin CMS\n• เพิ่ม Joystick ล่องหน (แตะจอเพื่อเดิน) และกด Shift เพื่อวิ่ง ใช้ได้ทั้งแผนที่หลักและในบ้าน\n• เพิ่มตัวเลือกโหมดควบคุมในหน้า Settings',
    image: null,
    date: '2026-06-23',
  },
  {
    id: 'su-34',
    type: 'new',
    title: 'Personal Map — แต่งบ้าน ชวนเพื่อนมาเที่ยว เห็นกันสด ๆ',
    description: 'เปิดตัว Personal Map พื้นที่ส่วนตัวของแต่ละคน\n\n• วางของตกแต่งในแผนที่ส่วนตัวได้เอง (โหมดแก้ไข + Palette)\n• เดินไปเยี่ยมแผนที่เพื่อนได้จากในแชทโดยตรง\n• เห็นอวาตาร์เพื่อนที่ออนไลน์อยู่ในแผนที่แบบเรียลไทม์',
    image: null,
    date: '2026-06-19',
  },
  {
    id: 'su-33',
    type: 'update',
    title: 'Roadmap Builder ปรับปรุงใหญ่ — Multi-select, Export/Import',
    description: 'ปรับปรุงเครื่องมือสร้าง Roadmap (React Flow) ยกใหญ่\n\n• เลือกหลายบล็อกพร้อมกัน (Multi-select) และลบทีเดียวได้ พร้อมปุ่ม Duplicate Selection\n• Export/Import Roadmap เป็นไฟล์ schema-v1 ได้แล้ว (ส่งออกเฉพาะส่วนที่เลือกก็ได้)\n• StageLabel ปรับขนาดได้ด้วยการลากขอบ บล็อกใหม่วางกึ่งกลางจอเสมอ\n• จุดเชื่อมต่อ (connection dots) ปรับให้กดง่ายขึ้นทุกด้าน ไม่แยก in/out',
    image: null,
    date: '2026-06-18',
  },
```

- [ ] **Step 2: Confirm ordering and id sequence**

`su-42` (today, 2026-07-04) must be the very first element after the
`STATIC_UPDATES = [` line; `su-32` (2026-06-18, the existing top entry) must
immediately follow `su-33`. Skim top-to-bottom and check `id` descends
`su-42, su-41, ..., su-33, su-32, su-31, ...` with no gaps other than the
intentionally-skipped `su-26`-dated cluster (there is no `id` gap — that
cluster simply never got an id, same as any day that ships nothing
changelog-worthy).

- [ ] **Step 3: Run the existing unit test**

Run: `npm test -- useNewsStore`
Expected: PASS (the test only asserts `getAllUpdates()` length grows and that
Firestore-sourced items sort first — it does not hardcode `STATIC_UPDATES`
length, so it's insensitive to the new entries).

- [ ] **Step 4: Manual check in the running app**

Run: `npm run dev`, open the app, open **News → RollerCoaster tab**.
Expected:
- Top card shows `su-42` ("ปรับโครงสร้างภายใน Chat/Social/Task ต่อเนื่อง"),
  dated today (04 ก.ค. 2026 in the `th-TH` short-date badge).
- Scrolling down shows `su-41` → `su-33` → `su-32` → ... in descending date
  order, no gaps or duplicate dates breaking the sort.
- Tapping any of the new cards opens `UpdateDetailSheet` with the full
  description and correct badge color (`green-100` for `new`,
  `blue-100` for `update`, `orange-100` for `fix` — see `UPDATE_TYPES` at the
  top of `appUpdates.js`).

- [ ] **Step 5: Commit**

```bash
git add src/data/appUpdates.js
git commit -m "docs(news): backfill RollerCoaster changelog su-33..su-42 (2026-06-18 → today)"
```

---

## Task 2: Note the Task 1 investigation outcome somewhere durable

Since Task 1 (the "fix" request) turned up no bug, don't invent a code change
to justify it. Instead:

- [ ] **Step 1: Record the finding**

No code changes needed. If you want a paper trail for "why wasn't the date
handling touched," this plan file itself (checked into
`docs/superpowers/plans/2026-07-04-news-changelog-backfill.md`) is that
record — no separate ADR is warranted since nothing architectural changed.

- [ ] **Step 2: Commit the plan file if it isn't already tracked**

```bash
git add docs/superpowers/plans/2026-07-04-news-changelog-backfill.md
git commit -m "docs: add news changelog backfill plan"
```

---

## Self-Review Notes (for whoever executes this)

- **Spec coverage:** Task 1 (date-today capability) → satisfied by `su-42`
  being dated 2026-07-04 plus the investigation write-up above. Task 2
  (backfill from last entry to now) → `su-33`..`su-42` cover every commit
  cluster from `a090786` (last commit touching `appUpdates.js`, 2026-06-18) to
  `HEAD` (2026-07-04), with one cluster (2026-06-26, docs-only) intentionally
  and explicitly skipped.
- **Known ambiguity to flag back to the requester:** the 2026-06-26 omission
  is a judgment call, not a fact — if the product owner wants 100% commit
  coverage with zero omissions regardless of user-facing value, add an
  `su-26.5`-style entry for it following the same pattern shown above.
