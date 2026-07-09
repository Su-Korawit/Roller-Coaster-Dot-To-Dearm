# design.md — I LOVE TCAS · Design Constitution

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

```css
@theme {
  /* existing */
  --color-brand:        #a78bda;  /* soft purple — accents, icons */
  --color-brand-strong: #7c3aed;  /* primary action fill */
  --color-brand-soft:   #f0eeff;  /* selected/pressed fills */
  --color-accent-pink:  #d93d8c;  /* highlights, title shadow */
  --color-ink:          #1a1035;  /* ALL borders, hard shadows, primary text */
  --color-surface:      #ffffff;  /* card/sheet body */

  /* new */
  --color-paper:        #fdf6ec;  /* parchment — panel & dialog backgrounds (game dialog box) */
  --color-hud:          #fffdf8;  /* HUD slab fill (slightly warm white) */
  --color-ink-soft:     #6b6284;  /* secondary text (replaces gray-400/500) */
  --color-good:         #3f9e58;  /* success, crops, "ready" */
  --color-warn:         #e0a53c;  /* gold, streak, caution */
  --color-danger:       #d9534f;  /* destructive, errors, badges */

  /* hard shadows as first-class tokens → shadow-hard / shadow-hard-sm classes */
  --shadow-hard:    4px 4px 0 0 #1a1035;
  --shadow-hard-sm: 3px 3px 0 0 #1a1035;
}
```

Usage rules:
- Text: `text-ink` primary, `text-ink-soft` secondary. Never `text-gray-*`.
- Panels/sheets: `bg-paper` body, `bg-surface` for cards *inside* a paper panel.
- Exactly **one** brand-strong action per view. Everything else is surface/ink.
- Semantic colors (`good`/`warn`/`danger`) only for their meanings, never decoration.
- Gradients: allowed **only** as full-screen scene backdrops (loading screen, auth sky).
  Never on buttons, text, cards, or icons.

## 4. Surface language — the `neo-*` system

Defined once in `src/index.css`, used everywhere. (`neo-card` / `neo-btn` already exist.)

| Class | Recipe | Use for |
|---|---|---|
| `neo-card` | 2px ink border · `rounded-2xl` (1rem) · surface bg · `shadow-hard` | Standalone cards, modals |
| `neo-btn` | 2px ink border · `shadow-hard` · hover lifts `(-2px,-2px)` · active presses `(4px,4px)` + shadow→0 · `steps(2)` | Every button and tappable tile |
| `neo-slab` | 2px ink border · `rounded-xl` (0.75rem) · `bg-hud` · `shadow-hard-sm` | HUD bars: stats, music pill, MiniPlayer, nav dock |
| `neo-sheet` | 2px ink border (no bottom) · `rounded-t-2xl` · `bg-paper` | All bottom sheets (Popup `variant="sheet"`) |
| `neo-pressed` | translate `(2px,2px)` · shadow none · `bg-brand-soft` | Active/selected state (nav tab, segmented tab, toggle-on) |

Radius scale — only three values: `rounded-lg` (buttons/tiles inside slabs), `rounded-xl`
(slabs), `rounded-2xl` (cards/sheets). `rounded-full` is reserved for avatars and
notification-count badges. Nothing else.

Shadows — only `shadow-hard` / `shadow-hard-sm` / none. Delete every `shadow-sm/md/lg/xl`
in chrome.

## 5. Typography

Two families, strict roles:

| Role | Font | Sizes | Rules |
|---|---|---|---|
| **Display / HUD** | Press Start 2P (`.pixel-font`) | 10px labels · 12px buttons/HUD numbers · 16px panel titles · 24px+ hero | Latin + digits ONLY. Never Thai (no Thai glyphs → fallback soup). **Never below 10px.** Uppercase. |
| **Body / ไทย** | Noto Sans Thai (`.thai-font`, body default) | 12px caption · 14px body · 16px section heading | Weights 400/600/700. All Thai text, all sentences, all form inputs. |

Hard bans:
- `pixel-font text-[7px]` / `text-[8px]` / `text-[9px]` — dead. Minimum is `text-[10px]`.
- Pixel font on any string containing Thai characters.
- Inline `style={{ fontFamily: ... }}` — use `.thai-font` / `.pixel-font` classes.
- Gradient-clipped text (`title-gradient`, `title-soft-gradient`).

Headline treatment (`pixel-title`): solid color + hard offset text-shadow — the type
version of the hard box shadow:

```css
.pixel-title       { color: var(--color-ink);  text-shadow: 3px 3px 0 var(--color-accent-pink); }
.pixel-title-dark  { color: #ffffff;           text-shadow: 3px 3px 0 var(--color-brand-strong); }
```

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

### Hub (`ilovetcas.com`) — top to bottom

```
┌──────────────────────────────────────────────────────────┐
│ SiteNav: [I LOVE TCAS]      Roadmap · คณะ · ข่าว · ตาราง │ [เข้าแอป] ← 1 CTA
├──────────────────────────────────────────────────────────┤
│  I LOVE TCAS (pixel eyebrow, 10px)                        │
│  พาดหัว OUTCOME ภาษาไทย (thai-font 800, 30–44px)          │  ← hero: text only,
│  ประโยครองหนึ่งบรรทัด (ink-soft)                           │    tools are the hero
├──────────────────────────────────────────────────────────┤
│  [ROADMAP]  [TCAS]  [NEWS]  [SCHOOL]   ← 4 tool cards     │  ← the product
│  (การ์ด: icon tile → pixel eyebrow EN → ชื่อไทย 700 →     │
│   คำอธิบาย 2 บรรทัด → เปิดเครื่องมือ →)                    │
├──────────────────────────────────────────────────────────┤
│  strip 3 ขั้น: ใช้ฟรีไม่ล็อกอิน → งานเก็บในเครื่อง →        │  ← "work your way"
│  ล็อกอินเมื่อพร้อม sync                                     │
├──────────────────────────────────────────────────────────┤
│  ██ แถบ ink เข้ม: PLAY YOUR PATH (pixel-title-dark)       │  ← app/game band
│  ██ ชวนเข้าแอปเต็ม+เกม + CTA เดียว                         │    (premium slot)
├──────────────────────────────────────────────────────────┤
│  trust strip: ฟรี 100% · ข้อมูล MyTCAS · ไม่ต้องสมัคร      │
│  WelcomeFooter                                            │
└──────────────────────────────────────────────────────────┘
```

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
