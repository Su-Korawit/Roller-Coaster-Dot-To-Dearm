# Follow-up: repoint artist-upload JSX to rc/ (Cursor)

**Context:** `docs/superpowers/plans/2026-07-03-rc-assets-migration.md` migrated the 39 files that had already leaked into `sprites/characters/`, `sprites/tilesets/`, and `sprites/objects/` to their correct `rc/` locations. This is a one-time data fix, not a code fix — the Admin Dashboard components that let artists upload new sprites still write into `sprites/`, so the leak will recur on the next artist upload. Per this project's Claude Code / Cursor split (`CLAUDE.md`), JSX/UI wiring is Cursor's job — this note hands that off.

**Files that need their upload/list/browse targets changed from `sprites/...` to `rc/...`:**

1. `src/components/admin/AssetsSection.jsx` — character upload paths (lines ~116, 133, 141, 160, 205, 224) currently target `sprites/characters/...`. Change to `rc/characters/...`.
2. `src/components/admin/MapConfigEditor.jsx` — `TILESET_FOLDERS` (line 9) is `['sprites/tilesets', 'sprites/objects']` and the upload destination (line 110) is `sprites/tilesets/${sanitize(name)}.png`. Change both to the `rc/` equivalents.
3. `src/components/admin/MapInfoScreen.jsx` — same pattern as MapConfigEditor: `TILESET_FOLDERS` (line 12), `listAll` calls (lines 132-133, 210-211), upload destination (line 180), display paths (lines 397, 406). Change all `sprites/tilesets`/`sprites/objects` references to `rc/tilesets`/`rc/objects`.
4. `src/utils/assetFolders.js` — `SYSTEM_FOLDERS` (lines 4-6) hardcodes `sprites/tilesets` and `sprites/objects` as the two system folders, and `createFolder()` (line 43) builds new custom folders as `sprites/${slug}`. Change the system folder paths to `rc/tilesets`/`rc/objects`, and change `createFolder` to build `rc/${slug}` so any future custom folder an artist creates also lands under `rc/`.

**Also check:** `src/components/admin/FarmItemsTab.jsx:61`, `src/components/admin/FarmPlantsTab.jsx:66`, and `src/components/ItemSprite.jsx:17` all hardcode `getDownloadURL(ref(storage, 'sprites/objects/Basic_Plants.png'))` — these read the crops spritesheet directly rather than via `assetManifest.js`. They must be repointed to `rc/objects/Basic_Plants.png` in the same change, or they'll 404 once this migration's Task 11 delete step removes the old file.

**Not in scope for this note:** Firestore `assetFolders` collection may already contain custom (non-system) folder documents with `path` values under `sprites/`, created via `createFolder()` before this fix. Those existing documents need the same kind of Storage-file migration this plan did for `mapConfigs` — audit `assetFolders` docs for `sprites/` paths and decide whether to migrate them once the JSX change lands.
