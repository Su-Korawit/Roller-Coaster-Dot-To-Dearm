# AFK cost notes (School World MVP, Task 1)

Date: 2026-10-14. Companion to `2026-10-14-school-world-mvp.md`.

## Finding

`worldScenes._tickPresence()` calls `updateSelf()` every frame; the old throttle
only enforced a 120 ms gap, so a **standing-still user still wrote ~8.3 times/s**
for as long as the tab was open. For an all-day AFK product that is the dominant cost.

## What changed

| Change | File |
|---|---|
| `updateSelf` is change-only (positions rounded; sub-pixel noise ignored) | `src/lib/presence.js` |
| One `idle: true` write after 60 s unchanged, then silence (no heartbeat; `onDisconnect` handles departure) | `src/lib/presence.js` |
| Phaser capped to 10 FPS after 60 s without input, restored on input | `src/game/idleGovernor.js`, `GameCanvas.jsx` |

## Measured vs. estimated (be careful which is which)

**Measured (unit test, mocked RTDB, fake timers):** an AFK user over 10 minutes at 60 fps
makes <= 2 `set()` calls. Before the change the same loop makes ~5000 (10 min x 60 s x 8.3).

**Estimated, NOT measured on real RTDB:** per-write payload ~120 B JSON; each write is pushed to
every other listener in the room (room cap 50 -> 49 listeners).
- Before: 8.3 writes/s x 49 x 120 B ~ 49 KB/s per idle user; a room of 50 idle users ~ 2.4 MB/s ~ 8.6 GB/hour.
- After: ~0 steady state (one write per idle transition).
- Multiply by the current RTDB per-GB download price (check the Firebase pricing page; not looked up here).

Not changed: **active** (moving) users still write up to 8.3/s. That is intended.

## Remaining risks / open items

1. Real-RTDB measurement is still owed: run two clients against the Firebase emulator or a staging project
   and read bandwidth from the console. The estimate above is arithmetic, not an observation.
2. `onValue` on the whole `players` node: fine at <= 50 players; do not raise the room cap without re-measuring.
3. Concurrent-connection limits: Spark plan caps RTDB at 100 simultaneous connections; the pilot needs Blaze
   plus a budget alert before any school invites its students.
4. `setFpsLimit` writes Phaser `TimeStep` internals (`fpsLimit`, `hasFpsLimit`, `_limitRate`); re-check on Phaser upgrades.
5. Remote idle avatars still tween/animate; render idle ones as static sprites if CPU matters on low-end phones.

## Go / no-go

**Go**, conditional on item 1. Suggested budget to confirm with the owner: idle-user cost target
< 1 KB/s steady-state download per connected user.
