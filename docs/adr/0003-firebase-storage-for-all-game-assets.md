---
status: accepted
---

# Game assets load from Firebase Storage; binaries are not committed to the repo

All game binaries — tilemap JSON, tileset images, character/object sprite sheets, and crop sprites —
resolve their URL at runtime from Firebase Storage via `cloudAsset(storagePath, { fallback })`
(`src/utils/cloudAsset.js`), listed in `src/game/assetManifest.js` (`GAME_ASSETS`), and resolved
before Phaser boots in `worldScenes.js` `resolveAssetUrls()`. Going forward, new game assets are
**uploaded to Storage and are not committed to the repo** — the manifest entry for a new asset
carries `fallback: null`.

This keeps the repo free of large binaries and makes the asset set swappable by admins (the Assets
admin tab replaces a Storage object without a code deploy) instead of requiring a Git commit + Vercel
build for every art change.

## Consequences

- **Storage is authoritative.** The canonical copy of every asset lives in Firebase Storage. The
  `localPath` / `fallback` argument is **best-effort only** and exists for assets that still happen
  to have a copy under `/public/assets/` from before this policy. New assets pass `fallback: null`;
  if Storage is unreachable, they simply fail to load rather than silently serving a repo copy.
- **`cloudAsset` caches per session** (path → Promise), so concurrent callers share one round-trip;
  `bustCache(path)` forces a re-fetch after an admin replaces an asset.
- **Offline dev** of game scenes requires the Storage objects to be reachable (or a warm cache).
  This is acceptable because game scenes are an embedded background feature, not a core offline flow.
- This decision governs **read-only display assets only**. It is orthogonal to *state* persistence
  (where game state lives, and the anti-cheat constraint that game state must not persist to
  localStorage) — see [[0004-server-authoritative-game-state]].

## Considered Options

- **Commit assets to the repo and serve from `/public`** (rejected) — simplest and works offline,
  but bloats the repo with binaries, couples every art change to a code deploy, and prevents admins
  from swapping assets at runtime.
- **Per-map tileset config only** (rejected as the general mechanism) — `mapConfig.tilesets` already
  resolves through `cloudAsset`, but it is map-scoped; game-wide assets (player sprite, crop sheet)
  are not tied to a single map and belong in `GAME_ASSETS`.
