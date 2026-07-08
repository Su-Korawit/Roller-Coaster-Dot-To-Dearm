# Premium Packaging (Entitlements + Coin Spending) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Coins spendable on real value: a server-authoritative `purchaseEntitlement` Cloud Function atomically debits Coins and grants entitlements (premium sticker packs, higher AI-generation caps, extra university Plan slots), with a catalog editable in Firestore and an "Unlock" section in the shop.

**Architecture:** Coins stay Functions-owned (clients cannot write `coins` — existing rule). A v2 `onCall` function runs a Firestore transaction: read catalog item + user coins → validate → `coins -= priceCoins` + `entitlements.{itemId} = { purchasedAt, payload }`. The client hydrates `entitlements` from the user doc it already reads in `sessionBootstrap` (zero extra round-trips) into a tiny `useEntitlementsStore`. Feature gates read that store: plan-slot cap in `usePlansStore.addPlan`, AI daily cap helper, sticker catalog extension. Catalog lives in `entitlementCatalog` (read signed-in / write super-admin), so pricing changes need no deploy.

**Tech Stack:** Firebase Cloud Functions v2 (`onCall` + `HttpsError`, Node 22 — same file/style as `createPurchase` in `functions/index.js`), Firestore transactions, Zustand, Vitest.

## Global Constraints

- **No TypeScript** (client); functions stay CommonJS matching `functions/index.js`.
- **Clients NEVER write `coins`** — the existing `users/{uid}` rule blocks it; all spending goes through the function. Do not add client-side coin decrements for purchases (chat gifts stay as-is, out of scope).
- **Entitlements are also client-read-only**: extend the `users/{uid}` update rule to block owner writes to `entitlements` exactly like `coins`.
- **Catalog is data, not code**: `entitlementCatalog/{itemId}` = `{ name, description, priceCoins, kind: 'sticker-pack' | 'ai-quota' | 'plan-slots', payload, active }`. `payload` examples: sticker-pack → `{ stickers: [{ id, label, url }] }`; ai-quota → `{ dailyBonus: 5 }`; plan-slots → `{ extraSlots: 3 }`.
- **Honest security note (accepted)**: the Gemini key is a `VITE_` client secret by design, so AI-cap enforcement is client-side (the entitlement raises a client-checked daily cap). This matches the app's existing reality; true server-side AI proxying is future work.
- **Free tier defaults**: `FREE_PLAN_SLOTS = 3`, `FREE_AI_DAILY = 3` — exported constants, single source in `src/constants/entitlements.js`.
- **Zustand selectors select raw store fields only** (commit `e1d67fe`).

**Background:** PRD #36 Epic G (stories 36–42); master roadmap item 5. Depends on Epic F's sticker catalog existing (`src/constants/stickerCatalog.js`).

---

### Task 1: Rules + db paths + constants

**Files:**
- Modify: `firestore.rules`, `src/lib/db.js`, `test/rules/firestore.rules.test.js`
- Create: `src/constants/entitlements.js`

- [ ] **Step 1: Rules** — in `firestore.rules`:

(a) In the `users/{uid}` update rule, change the owner-branch `hasAny(['coins'])` guard to also protect entitlements:

```
        (request.auth.uid == uid &&
          !request.resource.data.diff(resource.data).affectedKeys().hasAny(['coins', 'entitlements'])) ||
```

(b) After the `/timetableTemplates/` block add:

```
    // Entitlement catalog — priced unlockables. Signed-in read; super-admin
    // writes (pricing experiments without a deploy). Purchases themselves are
    // executed only by the purchaseEntitlement Cloud Function (Admin SDK).
    match /entitlementCatalog/{itemId} {
      allow read: if isSignedIn();
      allow write: if isSuperAdmin();
    }
```

- [ ] **Step 2: db paths** — in `src/lib/db.js`: `refs.entitlementItem: (id) => doc(db, 'entitlementCatalog', id),` · `cols.entitlementCatalog: collection(db, 'entitlementCatalog'),` · `queries.activeEntitlements: () => query(cols.entitlementCatalog, where('active', '==', true)),`

- [ ] **Step 3: Constants** — create `src/constants/entitlements.js`:

```js
// Free-tier caps raised by purchased entitlements (see useEntitlementsStore).
export const FREE_PLAN_SLOTS = 3
export const FREE_AI_DAILY = 3
```

- [ ] **Step 4: Rules tests** — append to `test/rules/firestore.rules.test.js`:

```js
describe('entitlements protection', () => {
  it('BLOCKS an owner writing their own entitlements field', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(alice, 'users/alice'), { entitlements: { 'sticker-pack-1': {} } }))
  })

  it('still allows owner writes to ordinary fields', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { aiLanguage: 'Thai' }))
  })

  it('entitlementCatalog: signed-in read, non-admin write blocked, admin write allowed', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'entitlementCatalog/item1'), { name: 'x', priceCoins: 50, active: true })
    })
    const alice = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(alice, 'entitlementCatalog/item1')))
    await assertFails(setDoc(doc(alice, 'entitlementCatalog/item2'), { priceCoins: 1 }))
    const admin = testEnv.authenticatedContext(SUPER_UID).firestore()
    await assertSucceeds(setDoc(doc(admin, 'entitlementCatalog/item2'), { name: 'y', priceCoins: 99, active: true }))
  })
})
```

- [ ] **Step 5: Run + deploy** — `npm run test:rules:emu` → PASS; `firebase deploy --only firestore:rules` (pre-authorized).
- [ ] **Step 6: Commit**

```bash
git add firestore.rules src/lib/db.js test/rules/firestore.rules.test.js src/constants/entitlements.js
git commit -m "feat(premium): entitlement catalog rules, paths, and free-tier constants"
```

---

### Task 2: `purchaseEntitlement` Cloud Function

**Files:**
- Modify: `functions/index.js`

- [ ] **Step 1: Implement** — append to `functions/index.js` (same style as `createPurchase`):

```js
// Atomically spends Coins on a catalog entitlement. Price and payload come
// from entitlementCatalog (never the client); coins and entitlements are
// Functions-owned fields, so this transaction is the only spend path.
exports.purchaseEntitlement = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  const itemId = req.data?.itemId
  if (!itemId) throw new HttpsError('invalid-argument', 'itemId is required.')

  const itemRef = db.collection('entitlementCatalog').doc(itemId)
  const userRef = db.collection('users').doc(uid)

  return db.runTransaction(async (tx) => {
    const [itemSnap, userSnap] = await Promise.all([tx.get(itemRef), tx.get(userRef)])
    if (!itemSnap.exists || itemSnap.data().active !== true) {
      throw new HttpsError('not-found', 'Item is not available.')
    }
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found.')

    const item = itemSnap.data()
    const user = userSnap.data()
    if (user.entitlements?.[itemId]) {
      throw new HttpsError('already-exists', 'Already owned.')
    }
    const price = Number(item.priceCoins)
    const balance = Number(user.coins ?? 0)
    if (!Number.isFinite(price) || price < 0) {
      throw new HttpsError('failed-precondition', 'Item is misconfigured.')
    }
    if (balance < price) throw new HttpsError('failed-precondition', 'INSUFFICIENT_COINS')

    const newBalance = balance - price
    tx.update(userRef, {
      coins: newBalance,
      [`entitlements.${itemId}`]: {
        kind: item.kind ?? null,
        payload: item.payload ?? null,
        pricePaid: price,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    })
    return { ok: true, newBalance, itemId }
  })
})
```

- [ ] **Step 2: Verify locally** — `cd functions && npm install` (if needed) then from repo root run the emulator smoke check: `firebase emulators:exec --only functions,firestore --project demo-rcdtd "node -e \"console.log('functions loaded ok')\""` — the exec proves `index.js` parses and both functions register (watch the emulator log for `purchaseEntitlement`). There is no functions unit-test infra in this repo; the client-side integration in Task 5's manual walkthrough covers behavior end-to-end on the emulator.
- [ ] **Step 3: Deploy** — `firebase deploy --only functions` (pre-authorized; requires the Blaze plan already used by `createPurchase`).
- [ ] **Step 4: Commit**

```bash
git add functions/index.js
git commit -m "feat(premium): purchaseEntitlement transaction (coins -> entitlements)"
```

---

### Task 3: `useEntitlementsStore` + session hydration

**Files:**
- Create: `src/stores/useEntitlementsStore.js`
- Test: `src/stores/useEntitlementsStore.test.js`
- Modify: `src/services/sessionBootstrap.js` + `src/services/sessionBootstrap.test.js`

**Interfaces:**
- State: `entitlements: {}` (the user-doc map), `catalog: []`, `catalogLoading: false`.
- `hydrateEntitlements(entitlementsMap)` — called by `sessionBootstrap` from the already-fetched user doc.
- `has(itemId)`; `extraPlanSlots()` (sum of owned `plan-slots` payloads' `extraSlots`); `aiDailyCap()` (`FREE_AI_DAILY` + sum of owned `ai-quota` payloads' `dailyBonus`); `ownedStickers()` (flat array from owned `sticker-pack` payloads).
- `loadCatalog()` — `getDocs(queries.activeEntitlements())`.
- `purchase(itemId)` — `httpsCallable(getFunctions(), 'purchaseEntitlement')`; on success: merge the item into `entitlements` locally and `useUserStore.getState().setCoins(newBalance)`.

- [ ] **Step 1: Write the failing tests**

Create `src/stores/useEntitlementsStore.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ getDocs: vi.fn(), callable: vi.fn(), setCoins: vi.fn() }))

vi.mock('firebase/firestore', () => ({ getDocs: (...a) => m.getDocs(...a) }))
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => (data) => m.callable(data),
}))
vi.mock('../lib/db', () => ({
  queries: { activeEntitlements: () => ({ _query: 'active' }) },
}))
vi.mock('./useUserStore', () => ({
  useUserStore: { getState: () => ({ setCoins: m.setCoins }) },
}))

const { useEntitlementsStore } = await import('./useEntitlementsStore')

describe('useEntitlementsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEntitlementsStore.setState({ entitlements: {}, catalog: [], catalogLoading: false })
  })

  it('hydrates and answers has()', () => {
    useEntitlementsStore.getState().hydrateEntitlements({ 'pack-1': { kind: 'sticker-pack' } })
    expect(useEntitlementsStore.getState().has('pack-1')).toBe(true)
    expect(useEntitlementsStore.getState().has('pack-2')).toBe(false)
  })

  it('derives extraPlanSlots and aiDailyCap from payloads', () => {
    useEntitlementsStore.getState().hydrateEntitlements({
      slots: { kind: 'plan-slots', payload: { extraSlots: 3 } },
      quota: { kind: 'ai-quota', payload: { dailyBonus: 5 } },
    })
    expect(useEntitlementsStore.getState().extraPlanSlots()).toBe(3)
    expect(useEntitlementsStore.getState().aiDailyCap()).toBe(3 + 5) // FREE_AI_DAILY + bonus
  })

  it('ownedStickers flattens sticker-pack payloads', () => {
    useEntitlementsStore.getState().hydrateEntitlements({
      pack: { kind: 'sticker-pack', payload: { stickers: [{ id: 's1', label: 'x', url: 'u' }] } },
    })
    expect(useEntitlementsStore.getState().ownedStickers()).toEqual([{ id: 's1', label: 'x', url: 'u' }])
  })

  it('loadCatalog fetches active items', async () => {
    m.getDocs.mockResolvedValue({ docs: [{ id: 'i1', data: () => ({ name: 'Pack', priceCoins: 50, active: true }) }] })
    await useEntitlementsStore.getState().loadCatalog()
    expect(m.getDocs).toHaveBeenCalledWith({ _query: 'active' })
    expect(useEntitlementsStore.getState().catalog).toEqual([{ id: 'i1', name: 'Pack', priceCoins: 50, active: true }])
  })

  it('purchase grants locally and updates the coin balance on success', async () => {
    useEntitlementsStore.setState({ catalog: [{ id: 'i1', kind: 'ai-quota', payload: { dailyBonus: 5 } }] })
    m.callable.mockResolvedValue({ data: { ok: true, newBalance: 120, itemId: 'i1' } })
    await useEntitlementsStore.getState().purchase('i1')
    expect(m.callable).toHaveBeenCalledWith({ itemId: 'i1' })
    expect(useEntitlementsStore.getState().has('i1')).toBe(true)
    expect(m.setCoins).toHaveBeenCalledWith(120)
  })

  it('purchase surfaces INSUFFICIENT_COINS', async () => {
    m.callable.mockRejectedValue(Object.assign(new Error('failed'), { message: 'INSUFFICIENT_COINS' }))
    await expect(useEntitlementsStore.getState().purchase('i1')).rejects.toThrow('INSUFFICIENT_COINS')
    expect(useEntitlementsStore.getState().has('i1')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**

```js
// src/stores/useEntitlementsStore.js
import { create } from 'zustand'
import { getDocs } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { queries } from '../lib/db'
import { useUserStore } from './useUserStore'
import { FREE_AI_DAILY } from '../constants/entitlements'

const owned = (entitlements, kind) =>
  Object.values(entitlements).filter((e) => e?.kind === kind)

export const useEntitlementsStore = create((set, get) => ({
  entitlements: {},
  catalog: [],
  catalogLoading: false,

  hydrateEntitlements: (map) => set({ entitlements: map ?? {} }),

  has: (itemId) => Boolean(get().entitlements[itemId]),
  extraPlanSlots: () =>
    owned(get().entitlements, 'plan-slots').reduce((sum, e) => sum + (e.payload?.extraSlots ?? 0), 0),
  aiDailyCap: () =>
    FREE_AI_DAILY + owned(get().entitlements, 'ai-quota').reduce((sum, e) => sum + (e.payload?.dailyBonus ?? 0), 0),
  ownedStickers: () =>
    owned(get().entitlements, 'sticker-pack').flatMap((e) => e.payload?.stickers ?? []),

  loadCatalog: async () => {
    set({ catalogLoading: true })
    try {
      const snap = await getDocs(queries.activeEntitlements())
      set({ catalog: snap.docs.map((d) => ({ id: d.id, ...d.data() })), catalogLoading: false })
    } catch (error) {
      console.error('[entitlements] catalog load failed:', error)
      set({ catalogLoading: false })
    }
  },

  purchase: async (itemId) => {
    const call = httpsCallable(getFunctions(), 'purchaseEntitlement')
    const { data } = await call({ itemId })
    const item = get().catalog.find((c) => c.id === itemId)
    set((s) => ({
      entitlements: {
        ...s.entitlements,
        [itemId]: { kind: item?.kind ?? null, payload: item?.payload ?? null },
      },
    }))
    useUserStore.getState().setCoins(data.newBalance)
    return data
  },
}))
```

Session hydration — in `sessionBootstrap.js`, right after the `serverCoins` block, add:

```js
  // Entitlements — Functions-owned, read from the same user-doc fetch.
  useEntitlementsStore.getState().hydrateEntitlements(userData?.entitlements ?? {})
```

(+ import). In `sessionBootstrap.test.js`: add `hydrateEntitlements: vi.fn()` to `m`, mock `../stores/useEntitlementsStore` as `{ useEntitlementsStore: { getState: () => ({ hydrateEntitlements: m.hydrateEntitlements }) } }`, and add a case asserting it's called with `{}` for the default user doc and with the map when `getDoc` returns `entitlements: { x: {} }`.

- [ ] **Step 4: Run to verify pass** — both suites PASS.
- [ ] **Step 5: Commit**

```bash
git add src/stores/useEntitlementsStore.js src/stores/useEntitlementsStore.test.js src/services/sessionBootstrap.js src/services/sessionBootstrap.test.js
git commit -m "feat(premium): useEntitlementsStore with catalog, purchase, and session hydration"
```

---

### Task 4: Feature gates — plan slots, AI cap, sticker packs

**Files:**
- Modify: `src/stores/usePlansStore.js` + `src/stores/usePlansStore.test.js`
- Modify: `src/components/roadmap/StickerPickerSheet.jsx` + its test
- Modify: `src/components/ProfilePanel.jsx` or wherever `generateJourney` is invoked (grep `aiJourney` / `generateJourney`) — gate only, no logic move

- [ ] **Step 1: Plan-slot gate (TDD)** — test first in `usePlansStore.test.js`:

```js
  it('addPlan refuses beyond FREE_PLAN_SLOTS + extraPlanSlots', () => {
    useEntitlementsStoreMock.extra = 0
    usePlansStore.getState().resetPlans()
    for (let i = 0; i < 3; i++) expect(usePlansStore.getState().addPlan()).toBeTruthy()
    expect(usePlansStore.getState().addPlan()).toBeNull()
    expect(usePlansStore.getState().plans).toHaveLength(3)
    useEntitlementsStoreMock.extra = 2
    expect(usePlansStore.getState().addPlan()).toBeTruthy()
  })
```

with a top-of-file mock `const useEntitlementsStoreMock = vi.hoisted(() => ({ extra: 0 }))` + `vi.mock('./useEntitlementsStore', () => ({ useEntitlementsStore: { getState: () => ({ extraPlanSlots: () => useEntitlementsStoreMock.extra }) } }))`. Implement in `usePlansStore.addPlan`: at the top,

```js
        const cap = FREE_PLAN_SLOTS + useEntitlementsStore.getState().extraPlanSlots()
        if (get().plans.length >= cap) return null
```

(change the creator to `(set, get)`; import both; existing behavior unchanged below the cap — note `usePlansStore`'s creator currently declares an unused `get`, so this also fixes that lint error).

- [ ] **Step 2: Sticker-pack merge** — in `StickerPickerSheet.jsx`, merge owned premium stickers into the grid: `const ownedStickers = useEntitlementsStore((s) => s.entitlements)` — then derive during render: `const premium = Object.values(ownedStickers).filter((e) => e?.kind === 'sticker-pack').flatMap((e) => e.payload?.stickers ?? [])` and render them under a third group header `พรีเมียม` when non-empty. Test: mock the entitlements store with one owned pack → its sticker button renders; with none → no `พรีเมียม` heading.
- [ ] **Step 3: AI cap gate** — grep the call site of `generateJourney` (`grep -rn "generateJourney" src/components src/pages`). Before invoking, count today's uses from a `aiUsage: { date, count }` field kept in `useUserStore` (add `trackAiUse(todayStr)` action: resets count on a new date, increments, returns the new count; plus `aiUsesToday(todayStr)`), and refuse with a Thai alert when `aiUsesToday >= useEntitlementsStore.getState().aiDailyCap()` — offering the unlock ("ครบโควต้า AI วันนี้แล้ว — ปลดล็อกเพิ่มได้ในร้านค้า"). Store action gets 2 tests (reset on new day, increment).
- [ ] **Step 4: Run** all touched suites → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/stores/usePlansStore.js src/stores/usePlansStore.test.js src/stores/useUserStore.js src/stores/useUserStore.test.js src/components/roadmap/StickerPickerSheet.jsx src/components/roadmap/StickerPickerSheet.test.jsx
git commit -m "feat(premium): plan-slot, AI-cap, and sticker-pack gates read entitlements"
```

(plus the `generateJourney` call-site file — add it to the `git add` when identified.)

---

### Task 5: Shop "Unlock" section + seed + verification

**Files:**
- Create: `src/components/shop/UnlockSection.jsx` + test
- Modify: the shop UI container (grep `ShopUI\|components/shop` for where product cards render) to mount `<UnlockSection />` under the coin top-up products

- [ ] **Step 1: UnlockSection (TDD)** — test: mock `useEntitlementsStore` (catalog of 2 items, one owned), `useUserStore` (coins 100). Asserts: items render name + `priceCoins`; owned item shows `เป็นเจ้าของแล้ว ✓` and no buy button; affordable item's buy button calls `purchase(itemId)`; unaffordable (price > coins) button disabled with `เหรียญไม่พอ`. Implement: `loadCatalog()` on mount; rows in `neo-card`s; purchase button handles the `INSUFFICIENT_COINS` rejection with a Thai alert. Selectors: raw fields only, derive owned/affordable during render.
- [ ] **Step 2: Mount it** — grep-first into the shop panel below the PromptPay products, heading `ปลดล็อกฟีเจอร์` (pixel-font).
- [ ] **Step 3: Seed the catalog** (operator or emulator): create 3 docs in `entitlementCatalog` via the Firebase console/admin — `sticker-pack-uni-extra` (`priceCoins: 79`, payload stickers = 6 more university logos), `ai-quota-plus` (`priceCoins: 99`, `{ dailyBonus: 5 }`), `plan-slots-plus` (`priceCoins: 49`, `{ extraSlots: 3 }`), all `active: true`.
- [ ] **Step 4: End-to-end on the emulator** — `firebase emulators:exec --only functions,firestore ...` or against production with a test account: buy `plan-slots-plus` with sufficient coins → coins drop by 49, 4th plan slot allowed, re-buy blocked (`already-exists`), insufficient coins blocked. Report results.
- [ ] **Step 5:** `npm test` + `npm run lint`; CONTEXT.md Domain Vocabulary — add: `| **Entitlement** | A purchased unlockable under \`users/{uid}.entitlements.{itemId}\` (Functions-owned, like Coins). Bought via the \`purchaseEntitlement\` callable from the \`entitlementCatalog\` collection; gates read \`useEntitlementsStore\` (plan slots, AI daily cap, premium stickers) |`
- [ ] **Step 6: Commit**

```bash
git add src/components/shop/UnlockSection.jsx src/components/shop/UnlockSection.test.jsx CONTEXT.md
git commit -m "feat(premium): shop Unlock section selling entitlements for Coins"
```

(plus the shop container file identified in Step 2.)

---

## Out of Scope

- Refunds / entitlement revocation UI (super-admin edits the user doc directly if ever needed).
- Subscriptions or consumable (repeat-purchase) items — every item is a permanent one-time unlock.
- Server-side AI proxying (accepted client-side cap; see Global Constraints).
- Chat-gift refactor onto entitlements.

---

## Cursor Prompt (single conversation, pre-authorized)

> Read `docs/superpowers/plans/2026-07-09-premium-packaging.md` and execute **ALL tasks (1–5) in order**, exactly as written, TDD, committing after each task with the exact messages given. The owner has pre-authorized every command — including `firebase deploy --only firestore:rules` and `firebase deploy --only functions` — run them directly; only stop on errors. This plan has grep-first anchors for the shop container and the `generateJourney` call site: adapt to the real structure but keep names/labels exactly. NOTE: this plan depends on Epic F's `stickerCatalog.js`/`StickerPickerSheet` — if they don't exist yet on this branch, merge or cherry-pick `feat/roadmap-showcase` first and say so in your report. Do the emulator end-to-end in Task 5 Step 4 and report results verbatim, then run the full `npm test` suite and report final counts.
