# I LOVE TCAS v2 — Overview (study room, hotbar, Open House, Plan, Soft Pixel)

**Date:** 2026-10-16
**Status:** draft for review
**Brainstorm assets:** `docs/superpowers/specs/assets/2026-10-16-ilovetcas-v2/`

## Goal

Turn the main app from "farm game + tools" into one loop a student keeps open while studying:

```
explore faculties (Open House campus)
  → add programs to a TCAS Plan
    → Plan says which subjects to study and by when
      → study in your own room (Forest-style focus)
        → earn Leaves → decorate the room, dress the character, adopt a pet
          → share a studygram card → friends visit / join
```

Every surface uses one visual language: **Soft Pixel** — white, minimal, pixel art with rounded shapes, purple ink outlines (from the existing character sprites), and a calm, living world.

## Decisions taken in brainstorming

| Topic | Decision |
|---|---|
| Campus map | One fictional university, **18 faculty buildings** built from MyTCAS `group_field` (15 groups, group 90 split into 4) |
| Data shape | Re-sorted **faculty → university → program → round** (MyTCAS is university-first) |
| Perspective | Top-down, same Phaser movement as today (joystick / tap-to-move / sprint / collision) |
| Campus layout | **Twin Quads, landscape**, campus on a **lake**, enter across a **wooden bridge**, spawn at the central hall |
| Building art | **Signature forms** — shared modern materials, one landmark element per faculty |
| Popup | **Round-first** (4 TCAS rounds) + filters; desktop side panel, mobile bottom sheet |
| Main-app maps | **Delete** Personal Map (`test3`) and Farm (`test2`) incl. the whole farm system. **Redraw** School Hub (mechanics kept) |
| Replacement | **Study Room**: Forest-style focus, Leaves currency, shop for furniture / themes / room expansions / pets / outfits |
| Focus strictness | User picks per session: **Strict** (×1.5, Forest rules) or **Flexible** (pause up to 2 min) |
| Character dress-up | Accessory layer on the 16 MBTI sprites + outfit recolour (existing `recolorImageData`) |
| Room growth | Start small, buy expansions **and** unlock whole-room themes |
| Existing farm/home data | Reset + welcome pack for every existing account |
| Navigation | **Hotbar of usable items replaces `BottomNavBar` app-wide**, with a hands-on guide, warp, and resume-where-you-left |
| Plan | **Automatic TCAS application plan** fed from the popup; aggregates exam subjects into focus-hour goals |
| Old Roadmap | Kept as "advanced mode" (and on `roadmap.ilovetcas.com`); no longer the main path |
| Legacy screens | **All existing screens are redesigned** to Soft Pixel |
| Studygram | Post-focus 4:5 share card, layout **B** (art first, one big number) |
| Motion | Ambient pixel animation everywhere (few frames, slow), time-of-day, pets with behaviour; reduced-motion respected |

## Sub-projects and order

Each sub-project has its own spec → plan → implementation cycle.

| # | Spec | Depends on | Why this order |
|---|---|---|---|
| 1 | [Soft Pixel design system + art pipeline + legacy redesign](2026-10-16-soft-pixel-redesign-design.md) — **part A** (tokens, components, art pipeline) | — | Every other piece draws with it |
| 2 | [Study Room](2026-10-16-study-room-design.md) (incl. farm/home removal) | 1A | User asked to fix the main app first; it is the core loop |
| 3 | [Hotbar, guide, warp](2026-10-16-hotbar-warp-guide-design.md) | 1A, 2 | Hotbar opens focus/shop/room; warp needs ≥2 places |
| 4 | [Open House campus](2026-10-16-openhouse-campus-design.md) | 1A, 3 (warp target) | Can start in parallel with 3 once 1A lands |
| 5 | [TCAS Plan](2026-10-16-tcas-plan-design.md) | 4 (popup), 2 (focus subjects) | Closes the loop |
| 6 | Soft Pixel **part B** — redesign every legacy screen + School Hub redraw | 1A | Can run in parallel with 2–5, one screen group per PR |

## Cross-cutting rules

- **Currencies stay separate.** Coins = real money (Functions-owned, unchanged). **Leaves** = earned only by verified focus (Functions-owned). Leaves can never be bought with Coins. Farm gold is removed.
- **Server-authoritative economy** (ADR-0004): leaf credits, purchases, room expansions go through Cloud Functions. Client writes only layout/cosmetic choices of items it already owns.
- **Firestore paths** only via `src/lib/db.js`; writes debounced via `syncManager`.
- **Guest mode** (ADR-0012) for `/openhouse` and Plan: local persist key + `rc-guest-dirty`, merged at login by `sessionBootstrap`.
- **Minors** (ADR-0018): no free-text chat added; share cards opt-in, no real name/school by default.
- **Battery/AFK**: all ambient animation goes through `idleGovernor`; hidden/AFK drops to static frames.
- **Accessibility**: `prefers-reduced-motion` honoured; every hotbar item has a text label (tooltip/long-press + `aria-label`); keyboard 1–7 + Esc; contrast checked on white.

## ADRs to write (during plans)

- ADR: Study Room replaces Personal Map + Farm (supersedes the farm parts of CONTEXT and earlier farm ADRs).
- ADR: Leaves currency and focus economy (extends ADR-0018 focus sessions).
- ADR: Hotbar replaces BottomNavBar; app-wide navigation model.
- ADR: Soft Pixel visual system (supersedes ADR-0019 cozy-pixel theme where they conflict).
- ADR: Open House precomputed index (per-program rounds crawl → Storage).

## CONTEXT.md vocabulary changes (applied with the ADRs)

Remove: Personal Map (as home), Farm plot, Farm gold, Farm persistence, Farm map, FarmGround/Plants layers, Farm Action button, Farm Data Catalog/Store, Farm Shop sell list, Shop/Chest zones (farm).
Add: Study Room, Room tier, Room theme, Desk slot, Leaves, Focus mode (strict/flexible), Focus tree, Studygram card, Pet, Hotbar item, Warp point, Resume point, Campus, Faculty building, Open House index, Plan entry, Exam subject goal.

## Out of scope (all sub-projects)

Multiplayer in the campus, free-text chat, buying Leaves, AI-generated plans, per-university campus maps, isometric view, native apps.
