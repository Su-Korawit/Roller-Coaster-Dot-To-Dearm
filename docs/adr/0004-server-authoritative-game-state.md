---
status: accepted
---

# Game state is server-authoritative (Firestore-only, no localStorage); user content may persist locally

The app has two persistence tiers, chosen per store by whether the data is a **cheat surface**:

**Tier 1 — user-authored content** (`useRoadmapStore`, `useTaskStore`, `useSkillStore`,
`useSelectStore`, `useShopChatStore`, `useUserStore`): uses Zustand `persist` middleware
(localStorage, `rc-*` keys) **and** debounced Firestore sync. The local copy is a resilience cache —
if the network drops mid-edit, the user does not lose their roadmap or notes.

**Tier 2 — game state** (`useFarmStore`, `useInventoryStore`: farm plots, hotbar/storage, farm gold):
plain `create(...)` with **no `persist` middleware**. The only persistence is debounced Firestore
sync via `syncManager` (`farmSync` → `maps/{uid}`, `inventorySync` → `users/{uid}`). Because a client
can freely rewrite localStorage, persisting game state there would let a player edit their gold,
inventory, or crop timers and have the edit sync up as truth. Game state therefore lives only where
the client's write can be constrained by Firestore security rules.

`coins` (real PromptPay currency) is the strongest case: it is written **only** by Cloud Functions,
never by client farm code — farm gold is a separate sandbox currency and must never touch `coins`.

## Consequences

- **`useFarmStore` / `useInventoryStore` must never gain `persist`.** The apparent inconsistency with
  `useRoadmapStore` (which has `persist`) is deliberate, not an oversight to "fix." Adding `persist`
  to a game store reopens the cheat surface.
- **`SaveSystem.js` was deleted** (it wrote game state to localStorage `sprout_quest_save`) precisely
  because it violated this tier. There is no manual save and no 30-second autosave timer — Firestore
  sync on mutation is the entire persistence story for game state.
- **Crop growth is deterministic from `plantedAt`** rather than a stored, client-incremented stage, so
  a visitor (and the owner after reload) recomputes the correct stage from a server timestamp instead
  of trusting a client-advanced counter — consistent with the server-authoritative stance.
- Stronger anti-cheat (server-validated plant/harvest via Cloud Functions, rate limits) is a possible
  future step; today the guarantee is "client cannot persist forged game state locally and have it win",
  enforced by Firestore-only writes plus security rules on `maps/{uid}` and `users/{uid}`.
- This decision is orthogonal to where *assets* load from — see [[0003-firebase-storage-for-all-game-assets]].

## Considered Options

- **One uniform tier — `persist` on every store** (rejected) — consistent and maximally offline-friendly,
  but turns every game-state field into a client-editable cheat surface.
- **One uniform tier — Firestore-only on every store** (rejected) — closes the cheat surface but loses
  the offline resilience that roadmap/notes editing needs; a network blip would drop in-progress work.
- **Per-data tiering** (chosen) — pay a small amount of "why are these two stores configured
  differently?" surprise (mitigated by this ADR) to get offline safety where it helps and
  server-authority where it matters.
