# Firebase Rules Sync Safety-Net Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Firebase Rules from silently breaking by giving them a test surface (storage rules) and a drift guard that fails when `ADMIN_ROLES` and the `.rules` files disagree.

**Architecture:** Two independent regression nets, no production-code or rules changes. Task 1 (candidate B) adds a storage-emulator rules suite mirroring the existing firestore/database suites and wires the storage emulator into `test:rules:emu`. Task 2 (candidate A) adds a pure unit test that reads `ADMIN_ROLES` from `src/constants/admin.js` and the email literals inside `firestore.rules` + `storage.rules`, asserting they agree — so hand-editing one file and forgetting another fails a test before deploy. No codegen, no build step (the lighter of the two sync mechanisms).

**Tech Stack:** Vitest 4, `@firebase/rules-unit-testing` 5, `firebase/storage` modular SDK, Firebase Emulator Suite (firestore + database + storage), Node ESM.

## Global Constraints

- **No TypeScript** — plain JS + ESM only. No `.ts`, no type annotations.
- **Test naming** — colocated `name.test.js` (per CONTEXT.md); emulator rules tests live under `test/rules/`.
- **Do not modify** `firestore.rules`, `storage.rules`, or `src/constants/admin.js` behaviour — these are regression nets around current intended behaviour. (The only permanent edit outside tests is one word added to a `package.json` script.)
- **`serviceAccountKey.json`** — never read, log, or commit. Emulator tests use `projectId: 'demo-rcdtd'` and need no credentials.
- **Emulator project id** — `demo-rcdtd` (matches existing suites and the `test:rules:emu` script).
- **Rules email literals are single-quoted** — the drift parser depends on this (e.g. `userEmail() == 'takadaoni07@gmail.com'`).

---

### Task 1: Storage-rules regression suite (candidate B)

Gives `storage.rules` — the most complex, currently untested rules file — an executable test surface. The suite locks the current section→prefix write matrix and the owner-scoped / public-read paths, so a future rules edit that breaks a section (like the recent `f3126b2` / `43690b0` hot-fixes) fails in CI instead of production.

**Files:**
- Modify: `package.json` (the `test:rules:emu` script — add `storage` to `--only`)
- Test: `test/rules/storage.rules.test.js` (create)

**Interfaces:**
- Consumes: `storage.rules` (read verbatim by `initializeTestEnvironment`); the emulator started by `test:rules:emu`.
- Produces: nothing imported by other tasks. Establishes the storage half of `npm run test:rules:emu`.

- [ ] **Step 1: Add the storage emulator to the emulator-exec script**

In `package.json`, change the `test:rules:emu` script so the emulator suite also boots Storage (it already reads `storage.rules` via `firebase.json`):

```json
"test:rules:emu": "firebase emulators:exec --only firestore,database,storage --project demo-rcdtd \"npm run test:rules\"",
```

(Only the `--only` list changes: `firestore,database` → `firestore,database,storage`.)

- [ ] **Step 2: Write the storage-rules suite**

Create `test/rules/storage.rules.test.js`:

```js
// Security-rules regression suite for storage.rules. Locks the section→prefix
// write matrix, owner-scoped paths, and public reads. Requires the Storage
// emulator — run:  npm run test:rules:emu
import { describe, it, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getBytes } from 'firebase/storage'

const SUPER_UID = 'IaltEhO0mPVfK3ng8npr4CdqnEE3'
const PNG = new Uint8Array([137, 80, 78, 71]) // rules never inspect content
const META = { contentType: 'image/png' }

let testEnv
const ctx = (uid, email) =>
  testEnv.authenticatedContext(uid, email ? { email } : undefined).storage()
const anon = () => testEnv.unauthenticatedContext().storage()

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
})

afterAll(async () => { await testEnv?.cleanup() })

describe('section-admin write scoping', () => {
  it('Characters admin writes sprites/characters but NOT maps/', async () => {
    const s = ctx('char', 'play198725@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'sprites/characters/INTJ.png'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'maps/test3.json'), PNG, META))
  })

  it('Maps admin writes maps/ and sprites/tilesets but NOT media/', async () => {
    const s = ctx('maps', 'takadaoni07@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'maps/test3.json'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'sprites/tilesets/grass.png'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'media/song.mp3'), PNG, META))
  })

  it('Music admin writes media/ but NOT sprites/characters', async () => {
    const s = ctx('music', 'itcity9476@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'media/song.mp3'), PNG, META))
    await assertFails(uploadBytes(ref(s, 'sprites/characters/INTJ.png'), PNG, META))
  })

  it('super-admin writes owner-only prefixes (ui/, audio/, welcome/)', async () => {
    const s = ctx(SUPER_UID, 'o.korawitt@gmail.com')
    await assertSucceeds(uploadBytes(ref(s, 'ui/button.png'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'audio/click.wav'), PNG, META))
    await assertSucceeds(uploadBytes(ref(s, 'welcome/cover.png'), PNG, META))
  })

  it('BLOCKS a non-admin from writing sprites/characters', async () => {
    const s = ctx('nobody', 'stranger@gmail.com')
    await assertFails(uploadBytes(ref(s, 'sprites/characters/INTJ.png'), PNG, META))
  })
})

describe('owner-scoped paths', () => {
  it('owner writes their own slip; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'slips/alice/p1'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'slips/alice/p2'), PNG, META))
  })

  it('owner writes their own roadmap image; a stranger cannot', async () => {
    await assertSucceeds(uploadBytes(ref(ctx('alice'), 'users/alice/roadmap/n1'), PNG, META))
    await assertFails(uploadBytes(ref(ctx('bob'), 'users/alice/roadmap/n2'), PNG, META))
  })
})

describe('public read', () => {
  beforeAll(async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await uploadBytes(ref(c.storage(), 'ui/button.png'), PNG, META)
      await uploadBytes(ref(c.storage(), 'slips/alice/p1'), PNG, META)
    })
  })

  it('allows an unauthenticated user to read ui/ assets', async () => {
    await assertSucceeds(getBytes(ref(anon(), 'ui/button.png')))
  })

  it('BLOCKS a stranger from reading another user’s slip', async () => {
    await assertFails(getBytes(ref(ctx('bob'), 'slips/alice/p1')))
  })
})
```

- [ ] **Step 3: Run the suite against current rules — expect all green**

Run: `npm run test:rules:emu`
Expected: the Firebase CLI boots firestore + database + storage emulators, then Vitest runs `test/rules/**`. All existing tests **plus** the new `storage.rules.test.js` (9 tests) PASS. These are regression tests — current `storage.rules` is correct, so green-on-first-run is the expected result.

If the storage emulator fails to start (`Error: storage emulator ...`), confirm the Firebase CLI is current (`firebase --version`); the storage emulator uses the default port 9199 and needs no extra `firebase.json` config beyond the existing `"storage": { "rules": "storage.rules" }` block.

- [ ] **Step 4: Prove the net bites (temporary regression)**

Temporarily break one rule to confirm the suite actually catches breakage. In `storage.rules`, change the Characters write line:

```
// from:
allow write: if isSuperAdmin() || userEmail() == 'play198725@gmail.com';
// to (temporary):
allow write: if isSuperAdmin();
```

Run: `npm run test:rules:emu`
Expected: `Characters admin writes sprites/characters but NOT maps/` FAILS (the `assertSucceeds` upload is now denied).

Then **revert** the `storage.rules` change (restore `|| userEmail() == 'play198725@gmail.com'`) and re-run:

Run: `npm run test:rules:emu`
Expected: all green again. Confirm `git diff storage.rules` is empty before committing.

- [ ] **Step 5: Commit**

```bash
git add package.json test/rules/storage.rules.test.js
git commit -m "test(rules): add storage.rules emulator regression suite

Locks the section->prefix write matrix, owner-scoped slip/roadmap paths,
and public reads. Wires the storage emulator into test:rules:emu."
```

---

### Task 2: ADMIN_ROLES ↔ rules drift guard (candidate A)

A pure, fast unit test (no emulator) that fails when the admin allow-lists in `src/constants/admin.js` and the email literals in the two `.rules` files stop agreeing — the exact "kept in sync by hand" drift the rules comments warn about. Lives in the default `npm test` suite so drift is caught on every run, not only under `test:rules:emu`.

**Files:**
- Test: `src/constants/adminRulesSync.test.js` (create)

**Interfaces:**
- Consumes: `ADMIN_ROLES`, `ADMIN_EMAIL` from `src/constants/admin.js`; `firestore.rules` + `storage.rules` read as text from repo root (Vitest cwd is the repo root).
- Produces: nothing imported elsewhere. A standing invariant test.

**Note on placement:** `vitest.config.js` excludes `test/rules/**` from the default `npm test` run, so an emulator-free drift test placed there would only run under `test:rules`. Colocating it in `src/constants/` (next to `admin.js` and the existing `admin.test.js`) puts it in the frequently-run `npm test` suite — maximising the chance drift is caught before deploy.

- [ ] **Step 1: Write the drift-guard test**

Create `src/constants/adminRulesSync.test.js`:

```js
// Guards against drift between ADMIN_ROLES (the app's role model) and the email
// literals hard-coded in firestore.rules + storage.rules. Pure test, no emulator:
// runs in the default `npm test` suite. See ADMIN_ROLES in ./admin.js — the rules
// gate section-admin writes by token email, and this asserts both stay in sync.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ADMIN_ROLES, ADMIN_EMAIL } from './admin'

const firestoreRules = readFileSync('firestore.rules', 'utf8')
const storageRules = readFileSync('storage.rules', 'utf8')

// Section admins are email-gated in the rules; the super-admin is UID-gated, so
// exclude their email from the email-literal comparisons.
const sectionAdminEmails = Object.keys(ADMIN_ROLES).filter((e) => e !== ADMIN_EMAIL)
const emailsForSection = (section) =>
  sectionAdminEmails.filter((e) => ADMIN_ROLES[e].includes(section)).sort()

// Every single-quoted email literal in a chunk of rules text.
const extractEmails = (text) =>
  [...text.matchAll(/'([^'@\s]+@[^'\s]+)'/g)].map((m) => m[1]).sort()

// Body of a named rules function: function name() { ... }
function fnBody(text, name) {
  const m = text.match(new RegExp(`function ${name}\\(\\)\\s*{([\\s\\S]*?)}`))
  if (!m) throw new Error(`function ${name}() not found in rules`)
  return m[1]
}

// The `allow write` condition of a storage match block for an inline-gated prefix.
function writeCond(text, matchPath) {
  const m = text.match(new RegExp(`match ${matchPath}[\\s\\S]*?allow write: if ([^\\n]+)`))
  if (!m) throw new Error(`write rule for ${matchPath} not found in storage.rules`)
  return m[1]
}

describe('ADMIN_ROLES ↔ rules email sync', () => {
  it('firestore canEditMaps() lists exactly the maps-section admins', () => {
    expect(extractEmails(fnBody(firestoreRules, 'canEditMaps'))).toEqual(emailsForSection('maps'))
  })

  it('firestore canEditMusic() lists exactly the music-section admins', () => {
    expect(extractEmails(fnBody(firestoreRules, 'canEditMusic'))).toEqual(emailsForSection('music'))
  })

  it('firestore canEditShop() lists no section-admin emails (super-admin only)', () => {
    expect(extractEmails(fnBody(firestoreRules, 'canEditShop'))).toEqual(emailsForSection('shop'))
  })

  it('storage canEditMaps() lists exactly the maps-section admins', () => {
    expect(extractEmails(fnBody(storageRules, 'canEditMaps'))).toEqual(emailsForSection('maps'))
  })

  it('storage sprites/characters write lists exactly the characters-section admins', () => {
    expect(extractEmails(writeCond(storageRules, '/sprites/characters/'))).toEqual(
      emailsForSection('characters'),
    )
  })

  it('storage media/ write lists exactly the music-section admins', () => {
    expect(extractEmails(writeCond(storageRules, '/media/'))).toEqual(emailsForSection('music'))
  })

  it('no unknown email appears in either rules file', () => {
    const known = new Set(Object.keys(ADMIN_ROLES))
    for (const e of [...extractEmails(firestoreRules), ...extractEmails(storageRules)]) {
      expect(known.has(e), `${e} is in the rules but not ADMIN_ROLES`).toBe(true)
    }
  })

  it('every section-admin email appears in at least one rules file', () => {
    const inRules = new Set([...extractEmails(firestoreRules), ...extractEmails(storageRules)])
    for (const e of sectionAdminEmails) {
      expect(inRules.has(e), `${e} is in ADMIN_ROLES but no rules file`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run the guard against current files — expect all green**

Run: `npx vitest run src/constants/adminRulesSync.test.js`
Expected: 8 tests PASS. `ADMIN_ROLES` and the rules currently agree, so green-on-first-run is expected.

- [ ] **Step 3: Prove the guard bites (temporary regression)**

Add a bogus admin to `src/constants/admin.js` `ADMIN_ROLES` without touching the rules:

```js
export const ADMIN_ROLES = {
  'o.korawitt@gmail.com': ['analytics', 'users', 'characters', 'maps', 'assets', 'music', 'shop', 'finance', 'welcome', 'farm'],
  'takadaoni07@gmail.com': ['maps', 'assets'],
  'play198725@gmail.com': ['characters'],
  'itcity9476@gmail.com': ['music'],
  'ghost@gmail.com': ['maps'], // TEMP — should trip the drift guard
}
```

Run: `npx vitest run src/constants/adminRulesSync.test.js`
Expected: FAIL — `firestore canEditMaps() lists exactly the maps-section admins` (ghost is expected but absent from the rules) and `every section-admin email appears in at least one rules file`.

Then **revert** the `admin.js` change (delete the `ghost` line) and re-run:

Run: `npx vitest run src/constants/adminRulesSync.test.js`
Expected: all green. Confirm `git diff src/constants/admin.js` is empty before committing.

- [ ] **Step 4: Confirm it runs in the default unit suite**

Run: `npm test`
Expected: the full unit suite passes and includes `src/constants/adminRulesSync.test.js` (drift guard now runs on every `npm test`).

- [ ] **Step 5: Commit**

```bash
git add src/constants/adminRulesSync.test.js
git commit -m "test(rules): guard ADMIN_ROLES against firestore/storage rules drift

Fails when a section admin is added/removed in admin.js without the
matching email literal in firestore.rules or storage.rules, and vice versa."
```

---

## Known limitation

The drift guard compares **email sets** per capability. It catches: an admin added/removed in one place but not the other, and any unknown email appearing in the rules. It does **not** re-derive the section→prefix/collection topology (which prefixes a section owns) — that mapping stays hand-written and is candidate **C** (a declarative scope table), deliberately out of scope for this lighter plan. It also does not cover the super-admin UID literal beyond its presence; the UID is asserted by the emulator suites' behavioural tests.

## Self-Review

- **Spec coverage:** Candidate B → Task 1 (storage suite + emulator wiring). Candidate A (drift-check variant) → Task 2. The `rc/` / ADR-0007 gap and the declarative scope table are candidate C, explicitly deferred under *Known limitation*.
- **Placeholder scan:** No TBD/TODO/"handle edge cases"; every code and command step is concrete.
- **Type/name consistency:** Helper names (`extractEmails`, `fnBody`, `writeCond`, `emailsForSection`, `sectionAdminEmails`) are defined once in Task 2 and used consistently. `PNG`/`META`/`ctx`/`anon` defined once in Task 1. Emulator project id `demo-rcdtd` matches existing suites. Script edit is the single-word `--only` change.
