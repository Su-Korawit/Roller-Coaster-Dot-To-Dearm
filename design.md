# design.md — I LOVE TCAS · Design Constitution

> **Soft Pixel (ADR-0021, 2026-10-16):** §3 colour tokens, §4 surface language and §5 typography below are
> **rewritten for Soft Pixel** (white, minimal, rounded pixel). Older parchment / "Sprout Lands" wording elsewhere in
> this file is historical until each screen group is migrated; where it conflicts with §3–§5, §3–§5 win.

> **TL;DR (ไทย):** UI ของแอปต้องเป็น "HUD ของเกม" ไม่ใช่แอป iOS ลอยทับเกม
> ทุกชิ้นส่วน chrome (ปุ่ม, แผง, nav) ต้องดูเหมือนมาจากตลับเกมเดียวกับโลก Sprout Lands ข้างหลัง:
> ขอบหมึกหนา 2px · เงาแข็งแบบ offset (ไม่มีเงาฟุ้ง) · ฟอนต์พิกเซลใช้เป็น display เท่านั้น (≥10px, ห้ามใช้กับภาษาไทย) ·
> ไทยทั้งหมดใช้ Noto Sans Thai · ไอคอน lucide เท่านั้น ห้าม emoji ใน control ·
> motion แบบ `steps()` (กระตุกแบบเกมพิกเซล ไม่ smooth แบบ material) ·
> ห้าม gradient ม่วงบนปุ่ม, ห้าม pill ขาวโปร่ง `bg-white/90 rounded-full shadow` เด็ดขาด — นั่นคือหน้าตา "AI ทำ"

This document is **binding** for all UI work (Cursor and Claude Code both). When a change
conflicts with this doc, this doc wins. It extends `CONTEXT.md` (styling section) and the
existing Welcome-page `neo-*` language in `src/index.css` — it does not replace them.

**Two scopes, one material language:**

| Scope | Sections | Thesis |
|---|---|---|
| **Part A — In-app UI** (`app.ilovetcas.com`) | §1–11 | The UI is the game's HUD |
| **Part B — Public sites** (hub + feature landings, ADR-0012) | §12–17 | The showroom around the cartridge |
| **Part C — OS shell** (`ilovetcas.com` + `app.`, ADR-0029) | §18–23 | The product is a device: login → passcode → Home → apps |

Part B inherits every Part A ban (no gradients on controls, no soft shadows, no emoji
chrome, pixel font Latin-only ≥10px, tokens only) — it changes *layout discipline*, not
material.

---

## 1. Design thesis

**The UI is the game's HUD.** The product's soul is the Sprout Lands pixel world rendered
by Phaser. Every piece of React chrome floats *inside that world*, so it must read as part
of the same cartridge: a Stardew-style dialog box, not a Material bottom sheet.

One sentence test for any new component:

> *"Would this look at home inside a cozy pixel farming game's pause menu?"*
> If no → redesign it before shipping.

### Why the current UI reads as "AI-generated"

These are the concrete tells found in the codebase. Each one is now **banned**:

| # | Tell (current code) | Why it screams AI-template | Replacement |
|---|---|---|---|
| 1 | `bg-white/90 rounded-full shadow` pills (HomePage header, music pill) | Default glassy iOS pill, zero relation to the game | `neo-slab` (§4) |
| 2 | `linear-gradient(135deg, #a78bda, #7c3aed)` CTA (Button.jsx, contact FAB) | The canonical AI purple-gradient button | Flat `bg-brand-strong` + ink border + hard shadow |
| 3 | `title-gradient` gradient-clipped headline text | Gradient text = template hero | `pixel-title` (solid + hard offset text-shadow, §5) |
| 4 | Emoji as UI icons (🎮 🎵 🔥 ⏸ ▶ ✕ 💬 🎢) | Placeholder look, renders differently per OS | lucide icons or custom sprite icons; emoji only in *content* (chat, empty states) |
| 5 | Press Start 2P at 7–9px as body text (`text-[7px]`…`text-[9px]`) | Illegible; pixel font as texture, not type | Pixel font is display-only, ≥10px, Latin only (§5) |
| 6 | Ad-hoc grays and blues (`text-gray-400`, `bg-blue-50`, `text-blue-700` in tracklist) | Palette drift; tokens ignored | Only tokens from §3 |
| 7 | Soft diffuse shadows (`shadow-lg`, `shadow-md`) on chrome | Material elevation model | Hard offset shadows only (`shadow-hard`, `shadow-hard-sm`) |
| 8 | `rounded-2xl`/`rounded-3xl`/`rounded-full` mixed freely | Radius soup | Fixed radius scale (§4) |
| 9 | Generic motion (`animate-bounce`, `animate-ping`, smooth `active:scale-95`) | Stock micro-interaction pack | Stepped `steps()` press mechanics (§7) |
| 10 | 8 unrelated floating layers on Home (avatar pill, music pill, stat pill, 3 FABs, news button, contact FAB) | No layout system; widgets sprinkled on | 2 HUD zones: top HUD bar + left quick rail (§8) |

---

## 2. The one aesthetic risk (own it)

**Chunky ink.** Every interactive surface wears a 2px `--color-ink` border and a hard
offset shadow, and *presses physically into* that shadow when tapped. Over a colorful
pixel world this is bold and heavy — that is intentional. The discipline that keeps it
from being noisy: **few surfaces**. Chrome is consolidated into a small number of slabs
(§8); everything else is the game showing through.

The **signature element** is the press mechanic: on `:active`, a control translates
`(4px, 4px)` and its shadow collapses to zero — it feels like pressing a physical button
on a Game Boy. Already implemented as `.neo-btn` on the Welcome page; it becomes global.

---

## 3. Color tokens

All colors come from `@theme` in `src/index.css`. **No raw hex in JSX. No Tailwind default
palette classes (`gray-*`, `blue-*`, `red-*`, `amber-*`…) in app chrome.**

| Group | Tokens (value) |
|---|---|
| Surfaces | `paper`/`surface`/`hud` `#FFFFFF` · `mist` `#F4F3F9` · `hairline` `#D9D5EA` |
| Lines | `line`/`edge`/`brand` `#5c4e92` (sprite outline) · `line-soft` `#6f63a6` |
| Brand + text | `brand-strong` `#463c74` · `brand-soft` `#EFEBFA` · `ink` `#2B2550` · `ink-soft` `#686288` · `accent-pink` `#B8467F` |
| State | `leaf`/`good` `#5FB57A` (bg only) · `good-strong` `#2F7A47` · `warn` `#E8A93B` (bg only) · `warn-strong` `#8A5A00` · `danger` `#C2413D` · `lime` `#8FD3A4` (focus ring) |
| Faculty zones | `zone-{health,sci,soc,biz,arts,earth}` with `-soft` (tint) and `-deep` (text) |
| Shape | `rounded-ui` 8px · `rounded-slot` 12px · `rounded-sheet` 20px · `shadow-px` `3px 3px 0 #5c4e92` · `shadow-px-sm` `2px 2px 0` |

Usage rules:
- Text: `text-ink` primary, `text-ink-soft` secondary — all text tokens meet AA (≥4.5:1) on white; `ink-soft` and each `zone-*-deep` also meet it on mist, brand-soft and the zone tints.
  `warn`, `good`, `leaf`, `lime` are **background-only**; use `*-strong` / `-deep` for copy, and never put `text-white` on them (use `text-ink`, or the `-strong` fill with white text).
- Panels/sheets: `bg-paper`; secondary areas `bg-mist`.
- Exactly **one** filled ink action per view. Everything else is paper/outline.
- Semantic colors (`good`/`warn`/`danger`) only for their meanings, never decoration.
- No pure black anywhere (UI or art). Gradients only as full-screen scene backdrops.

## 4. Surface language — the `px-*` system (`neo-*` are aliases)

Defined once in `src/index.css`. `.neo-*` classes remain as aliases until usages migrate.

| Class | Recipe | Use for |
|---|---|---|
| `px-card` | 2px line border · 8px radius · paper · `shadow-px` | Cards, modals |
| `px-btn` | 2px line border · `shadow-px-sm` · hover lifts (-1,-1) · active presses (2,2) with no shadow · `steps(2)` | Every button and tappable tile |
| `px-slab` | like card with `shadow-px-sm` | HUD bars, MiniPlayer, hotbar dock |
| `px-sheet` | 2px line border (no bottom) · 20px top radius · paper | Bottom sheets (Popup `variant="sheet"`) |
| `px-pressed` | translate (2,2) · no shadow · `bg-brand-soft` | Active / selected state |
| `px-input` | 2px hairline border · 12px radius · focus: line border + lime ring | Inputs |

Radius scale: 8 (buttons/cards), 12 (slots/inputs), 20 (sheets). `rounded-full` for avatars,
badges and toggles only. Shadows: `shadow-px` / `shadow-px-sm` / none — no blurred shadows in chrome.

## 5. Typography

| Role | Font | Rules |
|---|---|---|
| **Game UI** | Chakra Petch 500/600/700 (`.pixel-font`, `font-display`) | Headings, numbers, short labels; supports Thai. Sentence case, no all-caps. |
| **Body / ไทย** | Noto Sans Thai (`.thai-font`, body default) | All sentences, inputs, long Thai text. |
| **Wordmark** | Press Start 2P (`.wordmark-font`) | Latin only: `I LOVE TCAS`, `site.pixelName`. Never Thai, never below 10px. |

Hard bans: Press Start 2P on any string with Thai; inline `style={{ fontFamily }}` (use the
classes); gradient-clipped text. Headline treatment `pixel-title`: solid ink + `2px 2px 0 brand-soft`.

## 6. Iconography

- **One system: lucide-react**, `strokeWidth={2.5}` (chunky, matches ink borders), sizes 16/20/24.
- Emoji are **content, not chrome**: fine inside a chat message or an empty-state
  illustration line, banned in buttons, headers, nav, badges, and list controls.
- Custom sprite icons (CoinIcon, GoldIcon, MBTI sprites) are first-class — prefer them
  over lucide where a game-native icon exists. Render pixel sprites with
  `image-rendering: pixelated`.
- Close buttons: lucide `X` in a square `neo-btn` tile — never a text "✕".

## 7. Motion

Pixel games snap; they don't ease. Chrome motion uses **stepped timing**:

- Press/hover mechanics: `transition: transform 120ms steps(2), box-shadow 120ms steps(2)` (already in `.neo-btn`).
- Reveals (dropdowns, chips): 150–220ms, `steps(3)` translate + opacity.
- Bottom sheets: 220ms `steps(4)` slide-up (feels like a game menu sliding in).
- Loading: segmented block progress (discrete blocks filling), not a sliding gradient shimmer.
- Ban: `animate-bounce`, `animate-ping`, `animate-pulse` on chrome; long smooth eases.
- Every animation respects `@media (prefers-reduced-motion: reduce)` — snap to final state.

## 8. Layout & flow

### Home screen = game HUD, two zones only

```
┌────────────────────────────────────────────┐
│ [◉ avatar│♪ track… ]      [🔥7 · ⛀120 · ⛁45]│ ← TOP HUD: 2 slabs, one row
│ ┌──┐                                        │
│ │📅│                                        │
│ │🏆│  QUICK RAIL: square neo-btn tiles      │
│ │🗺│  (Calendar · Mastery · Roadmap · News) │
│ │📰│  ← News lives here, badge on tile     │
│ └──┘                                        │
│                                             │
│              GAME WORLD (hero)              │
│                                             │
│              [ MiniPlayer slab ]            │
│      [ HOME  TASK  SOCIAL  CHAT  PROF ]     │ ← NAV DOCK: neo-slab, active tab pressed
└────────────────────────────────────────────┘
```

- Nothing else floats. New floating widgets must join the rail or a slab — never a new corner.
- The game world is the hero: chrome covers edges only, center stays clear.

### Panels & sheets
- Full panels (Task/Chat/Social/Profile/Skill): `bg-paper` body; header = PanelHeader with
  pixel-font 16px Latin title (Thai subtitle in thai-font if needed) + square X tile.
- Bottom sheets: `neo-sheet` + chunky ink drag handle (`w-12 h-1.5 bg-ink rounded-full`).
- Onboarding: same paper dialog language + visible progress (`STEP 1/3` pixel label +
  filled/empty block indicators). Never a bare white full-screen.

### Empty states & errors
- Empty state = invitation: sprite/emoji illustration + one thai-font sentence + one action button.
- Errors say what happened and what to do next, in Thai, no apology, no vagueness.

## 9. Writing (Thai microcopy)

- Active voice, plain verbs, sentence case: "บันทึกแผน" not "ยืนยันการดำเนินการ".
- A button names its exact result and keeps that name through the flow
  (ปุ่ม "แชร์" → toast "แชร์แล้ว").
- Consistent vocabulary everywhere: ภารกิจ (Task), แผนเส้นทาง (Roadmap), เพื่อน (Social),
  แชท (Chat), โปรไฟล์ (Profile). Pixel-font labels stay English-Latin (TASK, CHAT…).
- One element, one job: labels label, examples demonstrate. No decorative filler text.

## 10. Accessibility floor (non-negotiable)

- Tap targets ≥ 44×44px.
- `focus-visible:ring-2 ring-brand` (+ `ring-offset` on dark) on every interactive element.
- Text contrast ≥ 4.5:1 — `ink` on `paper`/`surface`/`hud` passes; never `ink-soft` below 12px.
- `aria-label` on all icon-only buttons (Thai).
- `prefers-reduced-motion` honored by every animation.

## 11. Litmus checklist (run before merging any UI change)

1. Could this component appear in a cozy pixel game's pause menu? 
2. Zero raw hex / zero `gray-*`,`blue-*` default-palette classes?
3. Zero soft shadows, zero gradients on controls?
4. Pixel font ≥10px, Latin only? Thai in Noto Sans Thai?
5. Zero emoji inside controls?
6. Press mechanic + focus ring + reduced-motion present?
7. Does it join an existing HUD zone instead of adding a new floating layer?

If any answer is "no" — it's not done.

---

# Part B — Public sites (hub + feature landings)

> **TL;DR (ไทย):** เว็บสาธารณะ (ilovetcas.com + landing ของแต่ละเครื่องมือ) คือ
> "โชว์รูมของตลับเกม" — วินัย layout ระดับ ILOVEPDF (grid เป๊ะ, การ์ดขับด้วย typography,
> จังหวะ section ชัด, ขาวโล่งหายใจได้) แต่วัสดุยังเป็นตลับเดิม: ขอบหมึก 2px, เงาแข็ง,
> พิกเซลฟอนต์เป็น display Latin เท่านั้น พาดหัวไทยใช้ Noto Sans Thai หนา-ใหญ่
> ห้าม emoji เป็นไอคอน ห้าม gradient — ความ "โปร" มาจากความนิ่งของ grid
> ไม่ใช่การถอดอัตลักษณ์พิกเซลทิ้ง

## 12. References (studied 2026-07-10)

| Ref | What we take | What we do NOT take |
|---|---|---|
| **ilovepdf.com** | Hero = one outcome sentence + tools ARE the hero (grid immediately after); typography-driven cards (title + 1–2-line description, no icon circus); section rhythm: grid → "work your way" strip → premium band → trust badges → deep footer; generous whitespace | Its neutral sans identity, its red, its rounded-soft chrome |
| **2026 SaaS patterns** (saaslandingpage.com, genesysgrowth, swipepages roundups) | Outcome-first headline (not feature list); exactly ONE high-contrast primary CTA above the fold; proof/trust within two scrolls; single-field friction | Glassmorphism, purple-gradient heroes, smooth parallax circus |

One-sentence test for any public-site section:

> *"Would this section look at home on a serious tool suite's homepage — while still
> obviously belonging to the same cartridge as the game?"*

## 13. Page anatomy

### Hub (`ilovetcas.com`) — content site, top to bottom

```
┌──────────────────────────────────────────────────────────┐
│ HubNav: [I LOVE TCAS]   ค้นหา…   หมวด · ห้องคุย │ [เข้าแอป] │ ← 1 CTA
├──────────────────────────────────────────────────────────┤
│  ██ Banner เต็มจอ: ภาพแคมปัส (campus-hero.svg)             │  ← one idea:
│  ██ พาดหัว + ปุ่ม "เข้าแอป" (utm medium=banner)            │    read, then play
│  ██ บทความเด่น (siteConfig.featuredSlug หรือ ล่าสุด)        │
├──────────────────────────────────────────────────────────┤
│  แถวหมวด × 5: ข่าว TCAS · ค่าย · แนะแนว · เทียบโครงการ ·     │  ← CategoryRow:
│  ให้กำลังใจ  (ArticleCard ล่าสุด 3 ใบ + ดูทั้งหมด)          │    3 cards each
├──────────────────────────────────────────────────────────┤
│  OpenChatBand: ห้องคุย DEK70 บน LINE (ซ่อนถ้าไม่ตั้งลิงก์)   │
├──────────────────────────────────────────────────────────┤
│  ToolsStrip: Roadmap · TCAS · ตาราง · เกม (ไปแอป)          │  ← tools are a strip,
│  SiteFooter                                               │    no longer the hero
└──────────────────────────────────────────────────────────┘
```

Article page: cover → title → category / author / date / reading time → body
(`.article-body`, 17–18 px, line-height 1.75, ≤ 68 ch) → CtaBlock (open the app /
join OpenChat) → related articles. Pages are server-rendered by `api/content.js`
(ADR-0022); every link to the app carries `utm_source=hub`.

### Feature landing (LandingShell) — split hero

```
┌──────────────────────────────────────────────────────────┐
│ SiteNav (เหมือน hub + ปุ่มล็อกอิน/บันทึกของ FeatureLayout) │
├──────────────────────────────────────────────────────────┤
│  ROADMAP (pixel eyebrow)      ┌────────────────────────┐ │
│  h1 ไทยใหญ่ = SITES[key].h1   │  screenshot slot        │ │
│  intro = SITES[key].intro     │  (neo-card, พื้น        │ │
│  [เริ่มใช้เลย]  เครื่องมืออื่น →  │   checker pixel จางๆ)  │ │
├──────────────────────────────────────────────────────────┤
│  benefits 3 คอลัมน์ (lucide icon tile, ไม่มี emoji)        │
│  CTA ซ้ำ · ลิงก์กลับ hub · WelcomeFooter                  │
└──────────────────────────────────────────────────────────┘
```

**Copy sources are `SITES` fields only** (`src/constants/sites.js`):
`h1` = on-page headline · `intro` = on-page sub · `title`/`description` = `<head>` +
OG + prerender ONLY — **never render `title` in visible UI** (the `| I LOVE TCAS`
suffix reads as duplication; pixel font draws `|` as `I`).

## 14. Public-site typography

| Role | Font | Size | Notes |
|---|---|---|---|
| Wordmark / eyebrows / EN tool names | Press Start 2P | 10–12px, uppercase | Latin only — `pixelName` field, never Thai strings |
| **H1 ไทย (hero)** | Noto Sans Thai **800** | 30px mobile / 40–44px desktop, leading-tight | This is the "professional" register — scale contrast against the tiny pixel eyebrow is the signature |
| Section heading ไทย | Noto Sans Thai 700 | 20–24px | |
| Body / card description | Noto Sans Thai 400 | 14–16px, `text-ink-soft` | Max 2 lines in cards |
| Link/CTA labels | Noto Sans Thai 600 | 14px | Verb-first: "เปิดเครื่องมือ", "เริ่มวางแผน" |

## 15. Public-site surfaces & color

- Canvas: `--color-mist` (#f4f7fc — token added; kills the raw-hex `bg-[#F4F7FC]`).
  Sections alternate mist / surface. The app band is `bg-ink` with white/brand-soft text —
  the ONE dark moment on the page.
- Cards: `neo-card` + `neo-btn` press mechanics on the whole card (cards are buttons).
- Icon tiles: 40–48px square, `rounded-lg`, 2px ink border, flat `brand-soft` fill,
  lucide icon `strokeWidth={2.5}` in `brand-strong`. **This replaces every emoji.**
- Exactly one `bg-brand-strong` CTA per viewport: nav "เข้าแอป" | hero CTA | band CTA.
- Texture: `.pixel-checker` (2-tone 8px checkerboard, ink at 3–4% opacity) allowed as
  hero/screenshot-slot backdrop — the Part-A gradient ban stands; checker is the
  cartridge-native alternative to "atmosphere gradients".

## 16. Behavior

- SiteNav collapses tool links behind a "เครื่องมือ ▾" `neo-card` dropdown under 768px;
  wordmark always links to the hub.
- Whole-card links: the full `neo-card` is the anchor (44px+ targets everywhere).
- Landing screenshot slot: until real captures exist, checker backdrop + one thai-font
  line — never a gradient, never lorem.
- Motion budget per page: card hover lift + press (steps), ONE staggered reveal on hero
  (steps(3), ≤300ms). Nothing scroll-jacked. `prefers-reduced-motion` snaps all.

## 17. Public-site litmus (add to §11 when touching hub/landings)

1. Is every visible headline from `h1`/`intro`/`shortName`/`pixelName` — zero
   `site.title` leaks, zero `split('—')` string surgery?
2. Tools grid within the first scroll? Exactly one brand-strong CTA per viewport?
3. Zero emoji icons — every icon a lucide glyph inside an ink-bordered tile?
4. Thai never in pixel font; pixel font never under 10px?
5. Does the page still read as the same cartridge as the game (ink borders, hard
   shadows, checker — not a generic white SaaS template)?

---

# Part C — OS shell (`ilovetcas.com`, `app.ilovetcas.com`)

> **TL;DR (ไทย):** หน้าแรกของเว็บคือ "เครื่อง" เครื่องหนึ่ง (ADR-0029): Login Google → ตั้ง/ใส่รหัสผ่านเครื่อง →
> Home ที่เป็นกริดไอคอนแอป → แอปเปิดเป็นหน้าต่าง วัสดุยังเป็น Soft Pixel (ขอบหมึก เงาแข็ง ไอคอน lucide)
> แต่ "ฉากหลัง" คือวอลเปเปอร์พิกเซลอาร์ตเต็มจอ และแผง Login/ล็อกหน้าจอเป็นกระจกโปร่งวางบนวอลเปเปอร์
> **ห้ามมีลายตาราง/หมากรุกหลังหน้าจอ OS** (เจ้าของโปรเจกต์ไม่เอา)

Part C inherits every Part A ban except **one scoped exception: the glass panel (§19)**.

## 18. Wallpaper

- Five pixel-art themes (`lavender`, `sky`, `mint`, `sunset`, `night`), each a **portrait + landscape pair**
  (`public/assets/os/wallpapers/{id}-{portrait,landscape}.webp`, 854×1842 / 1672×941), chosen by
  `(orientation: portrait)`; the CSS gradient in `src/os/wallpapers.js` is the fallback only.
- Composition rule (also in every ChatGPT brief): detail along the **bottom edge and right corner**; the upper
  two-thirds and the upper-left stay calm and low-contrast — app icons and panels sit there.
- The user's own photo is a sixth choice (`custom`): stored on-device (IndexedDB, never uploaded), framed by a
  focal point + zoom so one picture fits every screen shape. Brightness is measured at upload;
  `dark` wallpapers flip all OS text to white.
- No checker, grid or pattern layer on any OS screen. Backdrops are the wallpaper and nothing else.

## 19. Glass panel (the one exception to "no glass")

Used only for the **Login panel** and the **lock-screen passcode panel**, directly over the wallpaper:

- `rounded-sheet`, `bg-paper/40` (`bg-ink/25` on dark wallpapers), `backdrop-blur-sm`; **no border, no shadow**.
- Controls inside stay solid: `px-btn` white buttons, ink text. Only the *container* is translucent.
- Never on app windows, sheets, Store or anything with content to read at length — those stay `px-card` white.
- Secondary text under a glass panel (e.g. "forgot passcode") is plain text, `text-sm font-medium`, ~90 % opacity
  with a faint halo for legibility — never a pill or a filled box.

## 20. Login & lock screen by device

| Device | Clock | Profile | Passcode entry |
|---|---|---|---|
| **Desktop / Mac** (≥1024px, fine pointer) | none | avatar + name, tap avatar to change | dots only, **type on the keyboard** |
| **Phone / tablet / iPad** (<1024px or `pointer: coarse`) | big, top (`text-7xl`→`text-9xl`) | **no avatar, no name** | number pad |

- Passcode is exactly 6 digits, per device (hashed, never synced). Panel is centred on the screen; the forgot / "not you?"
  link hangs *under* the panel without moving it.
- The Login panel keeps the clock on every device and centres the glass panel below it.

## 21. Home

- Grid by device: phone 4×5, tablet 6×4, desktop 8×3; pages scroll-snap horizontally, dots in a translucent pill.
- Chrome: phone/tablet = status bar on top, clock at the right; desktop = taskbar at the bottom, clock at the right.
- Icon = lucide glyph on a tone-token tile with the `px-card` ink border (no emoji, no image icons); label under it.
- Long-press (or right-click) an icon → details sheet; long-press empty space → wallpaper picker.
- Apps open as a full-screen window (phone/tablet) or a centred `px-card` window (desktop ≥1024px). One entry in
  `src/os/apps.js` adds an app.

## 22. Avatars & generated imagery

- Nine profile avatars (3 women, 3 men, 3 LGBTQ+): pixel-art heads-and-shoulders in pastel circles, ink-purple
  outline, no text. Fallback order: chosen avatar → Google photo → first letter of the name.
- All wallpapers and avatars are generated through ChatGPT from a work order in `ai-handoff/to-chatgpt/`
  that cites `ai-handoff/STYLE.md`; inspect before use (size, ratio, no text/grid, original work).

## 23. OS litmus (run before merging any `src/os/` change)

1. Any pattern, checker or grid behind an OS screen? Remove it.
2. Is the glass panel used anywhere other than login/lock? Make it a `px-card`.
3. Desktop lock screen: no clock, no on-screen keypad, panel dead centre? Touch devices: keypad, no avatar/name?
4. Does text stay readable on all five wallpapers **and** a dark custom photo (`dark` flag honoured)?
5. Works at 375×812, 768×1024 and 1280×800 with no horizontal scroll?
6. Tokens only — no `#fff`/off-token hex (the `legacyPurge` test enforces this).
