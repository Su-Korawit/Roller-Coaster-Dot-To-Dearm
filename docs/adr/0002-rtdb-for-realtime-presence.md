# ADR 0002 — Use Firebase RTDB (not Firestore) for Live Avatar Presence

**Status:** Accepted  
**Date:** 2026-06-19

## Context

The Multiplayer Personal Maps feature needs to broadcast each player's position (x, y, direction, moving) at high frequency (~60 fps throttled to ~8 writes/s) and automatically clean up a player's node when their tab closes or network drops.

Two Firebase options exist in this project:

| | Firestore | RTDB |
|---|---|---|
| Already used | Yes (roadmap, chat, maps, shop) | Initialized, unused |
| Write latency | ~200–500ms | ~50–100ms |
| Per-write cost | Yes (billed per document write) | No (billed by transfer volume) |
| `onDisconnect` | No built-in | Yes — built-in `onDisconnect().remove()` |
| Presence pattern | Requires Cloud Function or workaround | First-class citizen |
| Listener granularity | Per-document or per-collection | Any path subtree |

## Decision

Use **Firebase RTDB** for the `/worlds/{ownerUid}/players/{uid}` presence path.

Key reasons:

1. **`onDisconnect` is non-negotiable.** When a player closes their tab, RTDB automatically removes their node via `onDisconnect().remove()`, which was armed at join time. Firestore has no equivalent — a Cloud Function triggered on a "heartbeat timeout" is the only workaround and adds significant latency and complexity.

2. **Throttled writes are cheap.** At 120ms throttle the client writes ~8 positions/s. At MBTI sprite resolution (2 × float64 + a few fields) that's under 1 KB/s per player — RTDB's transfer-volume pricing is negligible. At Firestore's per-write pricing this would be expensive at scale.

3. **Low latency matters for avatar smoothness.** Phaser interpolates toward `targetX/targetY` each frame; the smoother the update cadence, the smoother the animation. RTDB's 50–100ms round-trip vs Firestore's 200–500ms is a meaningful difference.

## Consequences

- **New dependency on RTDB** (already initialized as `rtdb` in `src/firebase.js` — no new SDK bundle cost).
- **New security rules file** (`database.rules.json`, registered in `firebase.json`). Signed-in users can read any map room; each user may only write their own player node.
- Presence data is **ephemeral** — it is not persisted beyond the session. Decoration objects (persistent map state) remain in Firestore at `maps/{ownerUid}`.
- Tightening presence read access to mutual-follows only requires cross-document reads in RTDB rules, which RTDB does not support. This is a **known limitation** deferred to a follow-up; the UI already gates entry to friends via the Chat panel.
