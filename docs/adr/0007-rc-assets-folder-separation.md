---
status: accepted
---

# Separate Roller Coaster custom assets into rc/ in Firebase Storage

## Context

Firebase Storage previously mixed Sprout Lands assets (Cup Nooble) and Roller Coaster custom assets (MBTI character sprites, maps, tilesets) under the same `sprites/` and `maps/` prefixes. Adding an automated Sprout Lands sync would overwrite custom-drawn assets if the separation was not explicit.

## Decision

All Roller Coaster custom-drawn assets live under the `rc/` prefix in Firebase Storage:

```
rc/
├── characters/   MBTI spritesheet PNGs (ENFJ.png … ISTP.png)
├── maps/         Tiled JSON map files (test3.json, indoor.json, test2.json …)
├── tilesets/     Custom tileset PNGs not sourced from Sprout Lands
└── objects/      Custom object/furniture PNGs not sourced from Sprout Lands
```

Sprout Lands (Cup Nooble) assets live under `sprites/`, `ui/`, `audio/` — updated by `scripts/pushToFirebase.mjs` from the `rcd2d-assets-x-sprout-lands-assets` repo.

The `rc/` folder is never written by any automated sync script. Artists upload to it directly via the Admin Dashboard file manager.

`src/game/assetManifest.js` is the single source of truth that maps Phaser keys to Storage paths. RC asset paths start with `rc/`.

## Considered options

- **Exclude specific paths in sync script** — rejected; requires a maintained blocklist that silently breaks when new custom files are added inside `sprites/`.
- **Separate bucket** — rejected; Firebase Storage free tier has one bucket per project; adds auth complexity for no gain at this scale.
- **rc/ prefix** — accepted; zero configuration, impossible to accidentally overwrite, immediately obvious from any Storage browser.

## Consequences

- `assetManifest.js` entries for MBTI characters, maps, and custom tilesets must be updated to use `rc/` paths.
- `scripts/uploadAssets.mjs` (uploads RC assets) should write to `rc/` paths.
- The Admin Dashboard "Update Assets" sync only touches `sprites/`, `ui/`, `audio/` — `rc/` is never downloaded or overwritten.

## Phase 2 (2026-07-03)

The 39 files that had leaked into `sprites/characters/`, `sprites/tilesets/`, and `sprites/objects/` before this ADR were migrated to `rc/characters/`, `rc/tilesets/`, and `rc/objects/` respectively (see `docs/superpowers/plans/2026-07-03-rc-assets-migration.md`). `assetManifest.js`, `mapConfig.js`, and all live `mapConfigs/*` Firestore documents were repointed to match. `sprites/`, `ui/`, `audio/` in Storage now contain only official Sprout Lands files. A gap was also found and fixed during verification: `storage.rules` had no `rc/` match block, so client reads (`getDownloadURL()`) failed with `storage/unauthorized` for every `rc/` path in production; rules were added mirroring the `sprites/` section->role split and deployed.

**Not yet done:** `AssetsSection.jsx`, `MapConfigEditor.jsx`, `MapInfoScreen.jsx`, and `assetFolders.js` still write new artist uploads into `sprites/characters/`, `sprites/tilesets/`, and `sprites/objects/` — see the follow-up handoff at `docs/superpowers/plans/2026-07-03-rc-assets-jsx-followup.md`. Until that's fixed, every future Sprout Lands sync will re-flag new artist uploads as orphans.
