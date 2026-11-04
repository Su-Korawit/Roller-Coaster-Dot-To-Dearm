# Hotbar, Guide, Warp & Resume

**Date:** 2026-10-16 · **Status:** draft for review · **Overview:** [2026-10-16-ilovetcas-v2-overview.md](2026-10-16-ilovetcas-v2-overview.md)
**Art / mockup:** `assets/2026-10-16-ilovetcas-v2/hotbar-icons.png`, `mockups/hotbar-guide-warp.html`

## Purpose

Replace `BottomNavBar` (Home / Task / Social / Chat / Profile) across the main app with a game **hotbar of usable items**, teach it with a hands-on guide, let the player **warp** between places, and always **resume where they left off**.

## Items

| Default slot | Item (pixel icon) | Opens | Replaces |
|---|---|---|---|
| 1 | Focus clock | FocusSetupSheet (Study Room spec); if a session runs: FocusHud expand | — |
| 2 | Warp ticket | WarpSheet | Home |
| 3 | Plan notebook | PlanSheet (Plan spec) | — |
| 4 | Task clipboard | TaskPanel | Task |
| 5 | Letter | Friends sheet with tabs เพื่อน / แชท | Social + Chat |
| 6 | Shop bag | Shop sheet: tabs ใบไม้ (room items) / พรีเมียม (existing Coins shop) + "แต่งห้อง" toggles Decorate mode | — |
| 7 | T-shirt | Wardrobe + profile (character, accessories, outfit hue, profile panel) | Profile |
| bag button (fixed, after slot 7) | Backpack | **Bag**: all items incl. Guide (?), Settings, Music, News & TCAS calendar, School tools, Roadmap (advanced) | — |

- Tap = use. Long-press / hover = label tooltip. Keyboard: `1`–`7`, `B` bag, `Esc` closes the top sheet. Every slot has `aria-label` and a visible label in the bag.
- The selected slot lifts 4 px with a hard shadow (Soft Pixel). Badges (unread chat, due tasks, plan deadline ≤3 days) reuse `NotificationBadge`.
- **Customise:** in the Bag, drag an item onto a hotbar slot to swap. `warp` and `bag` can't be removed (bag is fixed; warp can move but not leave the bar). Stored `users/{uid}.hotbar: string[7]`; guests: `rc-hotbar` localStorage.
- Hotbar mounts where `BottomNavBar` is mounted today (`HomePage`, gated by its `shouldShowNav`) and in `OpenHousePage` (guest variant); hidden in full-screen tools (Roadmap advanced, admin). `MiniPlayer` and `ui/Popup` currently offset themselves above the floating nav — re-point those offsets to the hotbar height.

## Guide (hands-on onboarding)

- Host: the player's pet (or a default cat before adoption) in a speech bubble; spotlight cut-out on the target, rest dimmed.
- **Learn by doing** — a step completes only when the player performs the action:
  1. Focus: start a *practice focus* (1 minute, flexible, awards a one-time 10 Leaves, not counted toward leaderboard).
  2. Shop: buy the first item (welcome Leaves cover it).
  3. Decorate: place it in the room.
  4. Warp: go to the campus.
  5. Plan: enter a faculty building and add a program to the plan.
- Skip anytime; replay from Bag → คู่มือ. Progress `users/{uid}.guide = { step, done, skipped }` (guests: `rc-guide`). Contextual one-time tips later (first visit to School Hub, first friend visit) use the same bubble component.

## Warp

- WarpSheet lists destinations: **My room**, **Campus Open House**, **School Hub** (the user's school room or commons), **Friend's room** (pick from friends list; existing Visit rules).
- Each shows a thumbnail, "ล่าสุด: <place label>" and **ไปต่อ** (resume point). Long-press → go to that map's spawn instead. Current location is marked "ที่นี่".
- Warp transition: 400 ms pixel iris-out/in (static fade when reduced motion). Scene switch reuses the existing GameCanvas map-loading path; the farm portal logic is removed with the farm.

## Resume points

- Shape: `users/{uid}.resume = { last: mapKey, points: { [mapKey]: { x, y, facing, label, at } } }`; `label` comes from the nearest named zone (e.g. "หน้าตึกแพทย์", "ห้องสมุด ที่นั่ง 12", "ที่โต๊ะ").
- Written through `syncManager` (debounced ~10 s while moving) and flushed on `visibilitychange: hidden` / `pagehide` (best effort `sendBeacon`-style flush is not available for Firestore — use a final debounced write + local copy).
- Local copy `rc-resume` always written immediately, used if newer than the cloud copy (multi-device: newest `at` wins).
- On app start: `sessionBootstrap` hydrates resume → GameCanvas boots `last` map at its point. A valid point must be on a walkable tile; otherwise fall back to spawn.
- Guests on `/openhouse`: localStorage only; merged at login only if the cloud has none.

## Code map

| New / changed | Purpose |
|---|---|
| `src/components/hotbar/Hotbar.jsx`, `ItemSlot`, `BagSheet`, `WarpSheet`, `GuideOverlay` | UI |
| `src/constants/hotbarItems.js` | item registry `{ id, labelTh, icon, open: (ctx) => … }` |
| `src/stores/useHotbarStore.js`, `useResumeStore.js`, `useGuideStore.js` | state + sync |
| `src/lib/db.js` | `shapes.hotbar`, `shapes.resume`, `shapes.guide` |
| `HomePage` | mount Hotbar; replace the `activeTab` tab switching with item → sheet opening |
| `music/MiniPlayer`, `ui/Popup` | bottom offsets follow the hotbar |
| delete | `BottomNavBar.jsx`, farm `Hotbar.jsx` |

## Testing

- Unit: item registry completeness (every id has icon/label/open), hotbar swap rules (warp/bag constraints), resume merge (newest wins, invalid tile → spawn), guide step machine.
- Component: keyboard shortcuts, aria labels, badges.
- E2E: guide happy path; warp room → campus → reload → resumes at campus point.

## Out of scope

Gamepad support, more than 7 slots, item cooldowns/consumables.
