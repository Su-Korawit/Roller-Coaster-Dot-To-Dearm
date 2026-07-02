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
└── tilesets/     Custom tileset PNGs not sourced from Sprout Lands
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
