# Plan — Rebrand: Roller Coaster → I LOVE TCAS

**Date:** 2026-07-09 · **ADR:** [0011](../../adr/0011-rebrand-to-i-love-tcas.md) · **Status:** partially applied — docs remain

## Decisions (locked in grilling session)

| Question | Decision |
|---|---|
| Canonical wordmark | **`I LOVE TCAS`** — all caps, three words, everywhere. No other casing exists. |
| Rename depth | **User-facing only.** `rc-*` localStorage keys, `rc/` Storage prefix, Firebase project id, repo/folder/package name stay. |
| PromptPay merchant | `I LOVE TCAS` (fallback; `VITE_MERCHANT_NAME` still overrides) |
| Positioning | Unchanged — name-only rebrand, hero copy keeps its message |
| Domain ilovetcas.com | Added **alongside** `*.vercel.app`, no redirect yet |
| `<title>` | `I LOVE TCAS — วางแผนเส้นทางสู่มหาลัยแบบเกม` + Thai meta description |
| News Panel app-updates tab | Label **"อัปเดตแอป"** (internal key `rollercoaster` stays) |

## Already applied by Claude Code (tests: 805/805 pass)

- `docs/adr/0011-rebrand-to-i-love-tcas.md` — new ADR
- `index.html` — lang→`th`, new `<title>`, Thai meta description
- Brand strings swapped in: `HeroSection`, `WelcomeFooter`, `OnboardingIntro`,
  `AuthPage`, `RegisterPage`, `TopBar`, `ChatPanel`, `NewsPanel` (tab label →
  อัปเดตแอป), `ShopChatView`, `shopPrompt.js`, `shopConfig.js`,
  `UpdateAssetsSection`, `appUpdates.js` (tab-name references in old entries)
- "RC" logo monogram → interim "ILT" (AuthPage + OnboardingIntro) — proper
  pixel logo is follow-up art work

## Remaining — for Cursor (docs only, no runtime code)

1. **README.md**
   - Line 1: `# 🎢 Roller Coaster` → `# ❤️ I LOVE TCAS` and add on line 3 intro
     "(เดิมชื่อ Roller Coaster)" once.
   - Live-UI references (NOT the Recent Updates history table — history stays):
     - ~line 144: `Camphub tab + RollerCoaster (App Updates) tab` → `Camphub tab + อัปเดตแอป (App Updates) tab`
     - ~line 146: `RollerCoaster (App Updates)` → `อัปเดตแอป (App Updates)`
     - ~line 353 (Panel System table): `**RollerCoaster** (app updates, admin-managed)` → `**อัปเดตแอป** (app updates, admin-managed)`
     - ~line 664: `from within the RollerCoaster tab` → `from within the อัปเดตแอป tab`
2. **CONTEXT.md**
   - Heading: `# CONTEXT.md — Roller Coaster Dot To Dearm` → `# CONTEXT.md — I LOVE TCAS`
   - Insert a `## Brand` section right after the intro paragraph:
     - Wordmark `I LOVE TCAS`, all caps, three words — only way to write it (ADR 0011). Domain ilovetcas.com.
     - "Roller Coaster" = legacy name; survives ONLY in internal identifiers that must never be renamed: `rc-*` localStorage keys, `rc/` Storage prefix, Firebase project id/bucket `rollercoasterdottodream*`, repo/folder/package name.
3. **CLAUDE.md** — heading → `# CLAUDE.md — I LOVE TCAS`
4. **.cursor/rules/project.mdc** — update the project-name mentions the same way so Cursor's own context uses the new brand.
5. Optional sweep: `design.md`, `overview.md` headings; `src/data/skillData.js` line-1 comment. LICENSE keeps the legal/repo name — leave it.

## Verification (Claude Code, after Cursor)

- `npm test` green
- Grep `-i "roller"` in `src/` hits only internal identifiers (`rc-`, `rc/`, tab key `rollercoaster`, `rc-*` CSS keyframes) — zero user-visible strings
- Manual: welcome page, auth page, onboarding intro, TopBar, News tabs, shop chat

## Console tasks (owner — cannot be done from code)

1. Vercel → project → Domains → add `ilovetcas.com` (+ `www.ilovetcas.com`)
2. Firebase Console → Authentication → Settings → **Authorized domains** → add `ilovetcas.com` (Google sign-in breaks on the new domain without this)
3. Storage CORS already `*` for GET — nothing to do
