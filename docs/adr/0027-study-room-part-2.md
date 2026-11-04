# 0027 — Study Room part 2: bigger rooms, themes, pets, wardrobe, card, history, visits

**Status:** accepted
**Date:** 2026-10-24

## Context

ADR-0023 shipped the core loop (focus → Leaves → furniture) and kept the fields part 2 needs
(`rooms/{uid}.tier|theme|petId`, catalog kinds `tier|theme|pet|outfit|accessory`). This ADR covers the rest
of `docs/superpowers/specs/2026-10-16-study-room-design.md`: room tiers 1–3, extra themes, pets, a wardrobe
(accessories + outfit hue), the studygram card, the trophy history sheet and friend room visits. Plan:
`docs/superpowers/plans/2026-10-23-study-room-2.md`.

## Decision

- **One map, a shell per tier.** `public/maps/room.json` (storage path `maps/room_v2.json`) is 20×19 tiles
  and holds a self-contained shell for each tier: layers `Floor/Wall/Decor` (tier 0, the part 1 names, so
  older clients still load it) and `Floor_t1…Decor_t3`. `src/game/roomShell.js` decides which layers the scene
  creates, remaps theme tiles in place (`floor_minimal → floor_<theme>` …, falling back to the minimal tile),
  fits the camera and the "fit to screen" scale to the owned space, and picks the tier's spawn and hub portal
  (objects carry a `tier` property). Buying a tier therefore needs no map switch: applying it restarts the scene
  at the same spot.
- **Floor areas are data shared by server and client.** `TIER_AREAS` (tiles) in `functions/placement.js` and
  `src/room/placement.js`, run against one fixture file: t0 11×9; t1 14×10; t2 = t1 + a 6×8 lake balcony; t3 =
  t2 + a 10×9 second room. A footprint must fit inside ONE area (nothing straddles the wall or the door gap),
  `saveRoomLayout` refuses a tier that is not owned, and a downgrade that would strand furniture is refused
  (nothing is deleted silently).
- **Purchases are in order and unique.** `planPurchase` honours `requires` (`tier_2` needs `tier_1`;
  `REQUIRES_MISSING`), and tiers, themes, pets and accessories can be bought once. Applying a style is a layout
  change (`useRoomStore.setTier/setTheme/setPet`) validated by the same rules and saved through the same
  debounced `saveRoomLayout`.
- **The avatar is Functions-owned.** `users/{uid}.avatar = { accessories: { head, face, neck, back }, outfitHue }`
  is on the rules' deny-list (update and create) and written only by `saveAvatar`, which checks ownership,
  slot, and an integer hue 0–359 (`functions/avatarLogic.js`, parity-tested with `src/room/avatar.js`). Overlays
  are 48×48 frames in the character sheets' own order (`wardrobe.mjs`), drawn above the player; the hue is a
  recoloured copy of the MBTI sheet made once per hue, skipping outlines, whites and greys.
- **Pets** are a pure seeded state machine (`petBehaviour.js`): wander → groom → sleep (on a `pet_bed` when
  one is placed) → sit beside the player during a focus session → heart on tap; it never leaves the floor or
  enters furniture and stands still under reduced motion.
- **The studygram card** (layout B, 1080×1350) is built from a pure layer list (`cardLayers.js`; nothing about
  the person can enter it: no name, school, e-mail or id), painted small and scaled by a whole number with
  smoothing off (`renderCard.js`), then shared with the Web Share API (files) or downloaded
  (`shareImage.js`). Goal faculty and streak are opt-in.
- **History and the shelf.** The sheet reads the student's own `focusSessions` (index `uid` + `endedAt`
  desc; an unordered read sorted here is the fallback until it is deployed). `trophy_shelf` shows the last
  three real sessions as coloured markers.
- **Visits are read-only by construction.** `visitRoom` loads `rooms/{owner}` into `useVisitStore` and
  switches presence to `worlds/{owner}/maps/room`; while it is set, every editing path (place, pick up, tap,
  decorate, style changes, the shop/wardrobe/focus sheets, starting a focus session, the desk seat) refuses.
  A banner is the way home; any warp or portal ends the visit. The visitor keeps their own outfit; the friend's
  wardrobe is not read.

## Considered options

- **Four maps (one per tier).** Would switch maps on purchase and double the resume and warp cases. Rejected
  for shells in one map.
- **Recolouring with a tint.** A tint cannot rotate hue. Rejected for a recoloured sheet per hue.
- **Letting clients write `avatar`.** Rules cannot check ownership of an accessory. Rejected for the callable.
- **Showing the owner's outfit to visitors.** Needs a read of another user's document and a second recoloured
  texture for no gameplay value. Deferred.

## Consequences

- Deploy order: rules and indexes → functions (`saveAvatar`, `buyRoomItem`, `saveRoomLayout`) → seed
  (`seedRoomCatalog.mjs --apply` creates the missing rows) → assets → hosting (see `docs/study-room-ops.md` §8).
- Presence avatars of other players are still plain (no outfits in the School Hub yet).
- The balcony is a deck with a railing; there is no lake drawn outside it.
