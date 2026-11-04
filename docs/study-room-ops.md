# Study room — operations

For the owner. Background: ADR-0023 (`docs/adr/0023-study-room-replaces-farm.md`).

## 1. Deploy (order matters: rules → functions → seed → hosting)

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions:startFocus,functions:checkInFocus,functions:endFocus,functions:abandonFocus,functions:buyRoomItem,functions:claimWelcomePack,functions:saveRoomLayout
```

Seed the catalog **before** the new client goes live (without it the shop is empty and the
welcome pack grants only Leaves). It only creates missing rows and never overwrites a price
you already tuned:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seedRoomCatalog.mjs           # dry run
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/seedRoomCatalog.mjs --apply
```

Upload the new art and maps (they are also served from `public/` as a fallback, so the app
works even before this):

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/uploadAssets.mjs
```

Then merge to `main` (Vercel deploys the hosting).

## 2. After the release is stable: remove the farm data

The old farm and Personal Map documents are read-only now. Delete them (dry run first; it
prints counts and never touches coins, focus XP, Leaves, room inventory or rooms):

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/purgeLegacyWorld.mjs
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/purgeLegacyWorld.mjs --apply
```

Also delete the Firestore documents `mapConfigs/test2` and `mapConfigs/test3` and the Storage
objects `maps/test2.json`, `maps/test3.json` in the console (the app ignores them).

## 3. Everyday

- **Prices and visibility:** Admin → Rooms (super-admin). Changes apply immediately; hidden
  rows disappear from the shop but stay owned.
- **New furniture** needs code: a catalog row in `src/data/roomCatalogSeed.js`, a drawing in
  `scripts/art/families/roomitems.mjs`, then `node scripts/art/build.mjs roomitems`, the seed
  script and a deploy. Existing layouts are unaffected (unknown items are skipped, not lost).
- **Map or art changes** to the room: regenerate (`node scripts/buildRoom.mjs`), bump the
  storage path suffix in `src/game/assetManifest.js` (`maps/room_v2.json`) so no old copy is
  ever paired with new tiles, upload.

## 4. What to check after deploying

- A new account lands in the room with 100 Leaves and the starter furniture.
- A 10-minute Flexible session credits `floor(10 × 1.0)` = 10 Leaves; a 25-minute Strict
  session credits 41; hiding the tab for more than 10 s in Strict withers the tree and earns 0.
- Buying a lamp deducts its price once even if the button is pressed repeatedly.
- The School Hub exit door leads back to the room.

## 5. Rollback

Old clients cannot read `rooms`, so they will not show Leaves or the room; rolling the hosting
back is safe. The functions are additive (`startFocus` accepts the old no-argument call and
runs a Flexible 25-minute session). Do not run the purge script until you are sure you will
not roll back.

## 6. Hotbar, warp, resume and guide (ADR-0024)

Only rules and functions change; there is nothing to seed or upload.

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions:startFocus,functions:checkInFocus,functions:endFocus,functions:abandonFocus
```

After deploying, check with a fresh account: the Guide starts after the welcome pack; the practice
focus pays 10 Leaves once (a second account-level attempt answers `PRACTICE_DONE`) and the
leaderboard is unchanged; reloading the app puts the player back where they stood. Rollback:
old clients simply never send `practice`, so rolling hosting back is safe; the new user-doc
fields `hotbar`, `resume`, `guide` are client-owned and harmless to leave behind, and
`practiceRewarded` is Functions-owned and keeps the gift from being paid twice.

## 7. TCAS Plan (ADR-0025)

Rules and functions only; nothing to seed.

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions:startFocus,functions:checkInFocus,functions:endFocus,functions:abandonFocus
```

Check: a focus session started with a subject (Plan → อ่าน) adds its verified minutes to
`users/{uid}.focusBySubject.<key>` once when it ends (also when a Strict tree withered); a session
without a subject and a practice session write nothing; a bad `subjectKey` is refused with
`invalid-argument`. Rollback: old clients never send `subjectKey`; the new profile fields
(`plans[].v2`, `goalHours`) are ignored by older readers, and `focusBySubject` is Functions-owned.
