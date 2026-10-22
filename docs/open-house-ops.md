# Open House — operations

For the owner. Background: ADR-0026 (`docs/adr/0026-open-house-campus.md`).

## 1. Build the index (nothing is published until you run this)

The popup reads `data/mytcas/openhouse/index.json` and one file per building from public Storage.
Until they exist it shows "ข้อมูลตึกนี้กำลังอัปเดต".

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run refresh-openhouse-index
```

That is a dry run: it crawls MyTCAS, prints per-building counts and failures, and writes nothing.
If the numbers look right:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run refresh-openhouse-index -- --apply
```

- Building files are uploaded first and `index.json` last, so a half-finished run never publishes a
  half index.
- A result smaller than the index already published is refused; pass `--force` only when you know the
  smaller data is right.
- The year comes from `data/mytcas/meta.json` (else 2570); override it with `--year 2570`.
- When MyTCAS is thin or down the run falls back to the snapshot (same rule as
  `refresh-tcas-snapshot`); it says so in the output, so check that before `--apply`.
- Re-run whenever MyTCAS publishes a new round (the popup footer shows the index date to students).

## 2. Upload the campus art and map

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/uploadAssets.mjs
```

Uploads `maps/campus_v1.json`, `rc/tilesets/campus_tiles.png` and `rc/objects/campus_buildings.png`
(driven by `src/game/assetManifest.js`; unchanged files are skipped). The app also serves them from
`public/`, so this only moves the load off the host.

## 3. Regenerating the art or the map (developers)

```bash
node scripts/art/build.mjs campus campusbuildings   # tileset + 18 building sprites (palette lint)
node scripts/buildCampus.mjs                         # public/maps/campus.json from campusLayout.js
```

`scripts/buildCampus.test.js` fails if a door is no longer reachable on foot from the spawn.

## 4. Links

- `https://app.ilovetcas.com/openhouse` and `https://ilovetcas.com/openhouse` (guests welcome).
- Deep link a faculty: `/openhouse?b=med` (ids: med dent pharm vet allied sci it eng arch law comm
  pol hum biz tour fine edu agri).
- Not done yet (follow-up): server-rendered head tags and a sitemap entry for the hub path.
