# 0024 — Hotbar, Bag, Warp, resume points and the Guide

**Status:** accepted
**Date:** 2026-10-22

## Context

The home screen navigated with a five-tab `BottomNavBar` and a ≡ menu for calendar, mastery,
roadmap, school and news. The v2 product loop (explore → plan → study → earn → decorate) needs
the study tools one tap away, a way to move between places, a promise that the app reopens where
the student left it, and a first-run that teaches the loop by doing it. Design:
`docs/superpowers/specs/2026-10-16-hotbar-warp-guide-design.md`; plan:
`docs/superpowers/plans/2026-10-22-hotbar-warp-guide.md`.

## Decision

- **A 7-slot hotbar plus a fixed Bag button** replaces `BottomNavBar` and the ≡ menu. What each
  item opens is data (`src/constants/hotbarItems.js`: a view, a sheet or a popup), so
  `HomePage` keeps owning panels and the hotbar only calls `ctx.openView/openPopup/openSheet`.
  Keys `1`–`7` use a slot, `B` opens the Bag, `Esc` closes the top sheet. The slot order is
  stored in `users/{uid}.hotbar` (guests: `rc-hotbar`) and is **repaired on read** (wrong length,
  duplicates, unknown or not-ready ids, a missing `warp` all become a valid bar). `warp` may move
  but never leaves the bar. Bag slots are assigned by tap (arm an item, then pick a slot in the
  bar preview), which works on touch and with a keyboard; dragging is not needed.
- **Warp** lists places from a registry (`warpPlaces.js`): the room, the campus (only when its map
  exists in this build) and the School Hub (signed in; `enterSchoolHub` still picks the room and
  reports `NO_SCHOOL`/`ROOM_FULL`). It reuses the existing map-change path
  (`useSchoolWorldStore.requestMapChange` → `GameCanvas`). A 400 ms iris (a fade under reduced
  motion) covers the load and removes itself when loading ends, success or failure.
- **Resume points** `users/{uid}.resume = { last, points: { [mapKey]: { x, y, facing, label, at } } }`
  in unscaled map pixels. `MapScene` reports the position every 2 s while moving; the store writes
  `rc-resume` at once and the account copy through `createFirestoreSync` with a 10 s debounce,
  flushed when the page is hidden. The newer `at` wins per map when the two copies merge. On boot
  the app enters `last` only if that map is enterable (exists, not retired, not the School Hub) and
  the point is walkable; otherwise it falls back to the entry map's spawn. The School Hub is never
  recorded or auto-entered: it needs its asynchronous room choice, so Warp offers it explicitly.
- **The Guide** is a step machine fed by events the student causes (`practiced`, `bought`,
  `placed`, `warped`); producers only import `guideEvents.js`, so no store depends on the guide.
  A step finishes only when the student does it; steps that cannot apply (a guest, no Leaves, an
  item already owned, one place only, the unbuilt Plan step) are skipped by `available(ctx)`. The
  overlay never blocks input: with no target on screen it shows the bubble only and no dimming.
  Progress is `users/{uid}.guide` (guests `rc-guide`).
- **Practice focus** gives the Guide's first step a real session: `startFocus({ practice: true })`
  stores a flexible 1-minute session; `endFocus` pays a one-time **10 Leaves** when at least 45 s
  were verified, sets the Functions-owned flag `users/{uid}.practiceRewarded` in the same
  transaction and writes neither `focusDaily` nor `focusXp`, so it can never touch the
  leaderboard or the daily cap. The reward is decided on the server: the client cannot grant itself
  Leaves through the guide.

## Considered options

- **One tabbed Friends sheet (Social + Chat).** Both panels are full-screen with their own
  headers; embedding them needs a redesign. Rejected for now: the Letter slot opens the chat panel
  and the Bag item "เพื่อน" opens the social panel.
- **Drag-and-drop to arrange the bar.** Poor on touch and not keyboard-accessible; replaced by
  arm-then-pick.
- **Resume in Realtime Database presence.** Presence is ephemeral and per-room; a Firestore field
  with a local cache survives sign-out/in and devices.
- **A client-callable "complete guide step" that grants Leaves.** Trivially farmed. Rejected for the
  server-owned practice session.
- **Long-press to warp to a map's spawn.** Not discoverable and not keyboard-accessible; the sheet
  has an explicit "ไปจุดเริ่มต้น" button instead.

## Consequences

- Deploy order: Firestore rules, then the focus functions (`startFocus`, `checkInFocus`, `endFocus`,
  `abandonFocus`), then hosting. Old clients keep working (a request without `practice` behaves as
  before). No catalog seed is needed.
- The plan slot, the campus warp and the Guide's Plan step are rows waiting for their owners (TCAS
  Plan, Open House); they appear by flipping `ready` or adding the map.
- Unread-chat badges need a data model that does not exist; the badge hook (`badge`) is in place.
- The hotbar height is one constant (`hotbarLayout.js`); `Popup` and `MiniPlayer` follow it.
- The Settings switch "แถบไอเทมด่วน (Hotbar)" was removed: it had never done anything and now the
  hotbar is the only navigation, so a persisted `false` must not be able to hide it.
- Esc closes sheets first and then hands a popup to its own close logic (`popupClose.js`): the
  calendar restores Home and the daily mood check-in is not dismissable.
- A warp is refused (`BUSY`) while a map switch is in flight, and a resume map that fails to load
  is forgotten and replaced by the entry map, so neither can strand the student.
