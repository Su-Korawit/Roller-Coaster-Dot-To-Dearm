# Open House Campus — `/openhouse`

**Date:** 2026-10-16 · **Status:** draft for review · **Overview:** [2026-10-16-ilovetcas-v2-overview.md](2026-10-16-ilovetcas-v2-overview.md)
**Art / mockups:** `assets/2026-10-16-ilovetcas-v2/campus-layout.svg`, `faculty-building-styles.png` (middle row = chosen direction), `mockups/openhouse-popup.html`

## Purpose

An "online travel university open house": walk a beautiful pixel campus with a building for every faculty group in MyTCAS; enter a building to see **every admission path into that faculty across all universities**, round by round, and add programs to your Plan.

## Entry points

- `ilovetcas.com/openhouse` (hub site) and `app.ilovetcas.com/openhouse` — lazy `OpenHousePage`, **guest-usable**, never behind `RequireAuth`. Add an `openhouse` entry to `src/constants/sites.js` for head tags/prerender.
- In the main app the campus is map key `campus`, reached by Warp (Hotbar spec).
- Deep link `?b=<buildingId>` spawns in front of that building with its popup open (shareable).
- Guests get a reduced hotbar: Plan, Guide, Bag (settings/music), and a "เข้าสู่ระบบ" slot; Plan entries persist locally and merge at login.

## Buildings (18)

Derived from MyTCAS `group_field_id`; group 90 is split by keywords.

| id | Name (Thai) | Source | Zone | Signature element |
|---|---|---|---|---|
| `med` | แพทยศาสตร์ | 10 | health | glass atrium with red cross, rooftop helipad |
| `dent` | ทันตแพทยศาสตร์ | 12 | health | tooth-shaped canopy, white tiles |
| `pharm` | เภสัชศาสตร์ | 13 | health | capsule-shaped roof lantern, herb planters |
| `vet` | สัตวแพทยศาสตร์ | 14 | health | paw-print sign, small paddock |
| `allied` | สหเวช / พยาบาล / สาธารณสุข | 11 | health | ambulance bay, heartbeat line on facade |
| `sci` | วิทยาศาสตร์ | 21 | sci | observatory dome |
| `it` | เทคโนโลยีสารสนเทศ | 22 | sci | glass cube with pixel screens, antenna |
| `eng` | วิศวกรรมศาสตร์ | 30 | sci | saw-tooth roof workshop, gear |
| `arch` | สถาปัตยกรรมศาสตร์ | 40 | sci | cantilevered stacked boxes, green roof |
| `law` | นิติศาสตร์ | 90 split | soc | slim colonnade, floating roof, scales |
| `comm` | นิเทศศาสตร์ | 90 split | soc | broadcast tower, big screen, on-air sign |
| `pol` | รัฐศาสตร์ / สังคม | 90 split | soc | dome + flag row, round council hall |
| `hum` | อักษร / มนุษยศาสตร์ | 90 split | soc | library façade with arched windows, book banners |
| `biz` | บริหาร / บัญชี / เศรษฐศาสตร์ | 61 | biz | glass tower with ticker band |
| `tour` | ท่องเที่ยวและโรงแรม | 62 | biz | hotel canopy, suitcase sign, rooftop café |
| `fine` | ศิลปกรรม / ดนตรี / ออกแบบ | 80 | arts | sculptural wavy roof, piano-key steps |
| `edu` | ครุศาสตร์ / ศึกษาศาสตร์ | 70 | earth | school bell tower, chalkboard façade |
| `agri` | เกษตร / วนศาสตร์ | 50 | earth | greenhouse + rice field (east edge) |

**Group-90 split** (pure function, fixture-tested): match `field_name_th` against law → comm → pol rules; if the field is a language (อังกฤษ, จีน, ญี่ปุ่น, …) → `hum`; else match program + faculty names against the same rules; default `hum`. Against the current dataset: hum 384, pol 180, comm 145, law 63 rows.

## Map (Twin Quads, landscape, lakeside)

See `campus-layout.svg`. Scale: 1 layout unit ≈ ½ tile → map ≈ 107×85 tiles.

- **Arrival:** spawn on the wooden bridge over the lake (south), lakeside promenade along the whole south edge, gate, avenue north to the **central hall** (directory board + signposts).
- **West quad (health + science/tech):** top row med, dent, pharm, vet, allied; bottom row sci, it, eng, arch; fountain at the centre; all doors face the lawn.
- **East quad (society, business, arts, education):** top row law, comm, pol, hum; bottom row biz, tour, fine, edu; stage at the centre.
- **East edge:** agri building + rice field.
- Ambient: lake shimmer, lily pads, birds, students' silhouettes are *not* added (no fake crowd); time-of-day tint as in the room.
- First visit: one 2-s camera pan bridge → hall (skippable; skipped under reduced motion) + one-line hint "เดินเข้าตึกเพื่อดูเส้นทางเข้าคณะ".

**Wayfinding:** building name sign appears near the door at close range (icon only from afar); directory board at the hall opens the full map; arrow signposts at junctions; minimap (top-right, tap a building → auto-walk along the path graph); Warp sheet in the campus adds a "ตึกคณะ" list for auto-walk.

**Entering:** standing in a door zone shows an "เข้าตึก" action button (same pattern as the old Farm Action button: tap-safe, never auto-opens); desktop `E`/`Enter`; `Esc` or walking away closes.

## Data — Open House index

Per-program rounds come from an upstream call **per program** (`program-projects/program-id/{id}`), so the popup cannot fetch live (eng alone has 618 rows). The index is **precomputed**:

- `scripts/refreshOpenHouseIndex.mjs` (`npm run refresh-openhouse-index`, owner creds): load courses via the same source picker as `api/mytcas.js` (live or snapshot), **dedupe by `program_id`** (the raw data repeats ids), classify into buildings, crawl rounds with concurrency 4 + retry/backoff, keep only the current TCAS year (`type` suffix), and write to Storage:
  - `data/mytcas/openhouse/index.json` — `{ tcasYear, updatedAt, buildings: { [id]: { programs, universities, rounds: { 1..4: { universities, seats } } } } }`
  - `data/mytcas/openhouse/{buildingId}.json` — `{ universities: [{ id, nameTh, typeTh, logoUrl, programs: [{ programId, nameTh, typeTh, costText, rounds: [{ round, seats, projects: [{ nameTh, seats, minGpax, scores:[{key,label,weight}], link }] }] }] }] }`
- Score labels reuse `SCORE_LABELS` (move to a shared module used by both `api/mytcas.js` and the script).
- Storage `data/` is already public-read. Run whenever MyTCAS publishes a round; the popup footer shows `updatedAt`.
- Pure module `src/utils/openHouseIndex.js` (`classifyBuilding`, `splitGroup90`, `summariseRounds`, `filterUniversities`) is shared by the script and the client and fully unit-tested.

## Popup (approved mockup)

The mockup predates the "softer" decision: build it with Soft Pixel tokens (rounded 8/12 px corners, not notched).

- Desktop: right side panel (map stays visible). Mobile: bottom sheet (84%).
- Header: building sprite, name, `N มหาลัย`, `N หลักสูตร`, zone colour tint.
- **Round tabs 1–4** with university count per round; rounds with zero entries show "ยังไม่ประกาศ" (greyed, still selectable).
- Filters: search (university or program; Thai-normalised, ignores "มหาวิทยาลัย" prefix), university type chips (from `university_type_name_th`), sort (ที่นั่งมากสุด / ชื่อ / จำนวนหลักสูตร). **No fee filter in v1** — `cost` is free text; show it verbatim (truncated, expandable).
- Rows: logo, university, program summary, seats in the selected round. Expanding shows the round's projects: name, seats, min GPAX, score-weight bars, "เปิดใน MyTCAS", and **"+ เพิ่มเข้าแผน"** (Plan spec).
- Empty / error states: building file missing → "ข้อมูลตึกนี้กำลังอัปเดต ลองใหม่อีกครั้ง" + retry; no results for filters → clear-filters action.

## Code map

| New | Purpose |
|---|---|
| `src/pages/OpenHousePage.jsx` | guest entry, mounts GameCanvas with `campus` |
| `src/game/CampusScene.js` (or campus branch in the world scene) | doors, signs, minimap data, auto-walk path graph |
| `src/components/openhouse/*` | FacultyPopup, RoundTabs, UniversityRow, ProjectCard, Minimap, DirectoryBoard |
| `src/stores/useOpenHouseStore.js` | index + per-building cache (session) |
| `src/utils/openHouseIndex.js` | pure classification/summaries |
| `scripts/refreshOpenHouseIndex.mjs` | crawl + write Storage |
| `public/maps/campus.json` + art from the pipeline | map |

## Testing

- Unit: building classification over a fixture of real rows (incl. group-90 edge cases), dedupe, round summaries, filters/search/sort.
- Script: dry-run mode on a 50-program fixture with a mocked upstream; output schema test.
- Component: popup tabs, "ยังไม่ประกาศ", error/empty states, add-to-plan button wiring.
- E2E: open `/openhouse?b=med` as guest → popup open → switch round → add to plan → reload → plan entry still there.

## Out of scope

Live per-program fetch, fee filter, multiplayer in the campus, per-university campuses, NPC crowds.
