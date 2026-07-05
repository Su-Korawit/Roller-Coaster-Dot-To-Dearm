# Fix Bug: University Logos Not Showing — Implementation Plan

> **For agentic workers (Cursor):** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Commit after each task. This is a **bug fix** — reproduce and confirm the root cause (Task 1) BEFORE changing behavior.

**Symptom:** University logos don't show in the University step (and anywhere `UniversityLogo` / `tcasLogoUrl` is used — Plan List cards, Profile). Many render as the text badge instead of the real logo.

**Root cause (from code inspection — confirm in Task 1):** The logo fallback chain in `src/components/onboarding/UniversityStep.jsx` (`UniversityLogo`) has a **race**. Chain is `cdn (uni.logo_url) → cloud (Firebase Storage) → local (bundled) → badge`. `cloudUrl` is loaded **asynchronously** (`cloudAsset(...).then(setCloudUrl)`, line ~31), but `nextStage()` (lines ~41-45) reads `cloudUrl` **synchronously** when the CDN `<img>` fires `onError`. The MyTCAS CDN (`https://assets.mytcas.com/i/logo/{id}.png`) 404s quickly for many universities, so `onError` fires **before** `cloudUrl` resolves → `cloudUrl` is still `null` → the `'cloud'` stage is skipped entirely → it jumps to `'local'` (only exists for legacy-mapped universities) or `'badge'`. Result: live TCAS universities with a 404 CDN logo and no bundled local image fall straight to a text badge.

**Fix:** Make the stage machine advance deterministically (`cdn → cloud → local → badge`) and **wait** for the async `cloudUrl` while in the `cloud` stage (auto-advancing only once it resolves to null). Then confirm at least one source actually serves logos (Task 3).

**Tech Stack:** React 19, Vite, Vitest + jsdom, `@testing-library/react`.

## Global Constraints

- Plain JS/JSX only.
- Keep the existing public API: `UniversityLogo({ uni })`, `tcasLogoUrl(id)` unchanged in signature.
- Keep `pixel-font` on the badge fallback.

---

### Task 1: Reproduce + confirm which stage fails

**Files:** none (diagnosis).

- [ ] **Step 1:** `npm run dev` → open the University step. Open DevTools → Network, filter Images.
- [ ] **Step 2:** Record for a few universities: does `https://assets.mytcas.com/i/logo/{id}.png` return **200** or **404**? Is it blocked (CORS / `ERR_BLOCKED_BY_*`)?
  - If **200 for all** → the CDN works; the bug is elsewhere (e.g. the redesign stopped rendering the logo, or a wrong field) — note it and adjust the fix.
  - If **404 / blocked for many** → confirms the race path; proceed with Task 2 + Task 3.
- [ ] **Step 3:** Check whether the `cloud` stage ever fires: temporarily `console.log(stage, cloudUrl)` in `UniversityLogo`. Confirm whether `'cloud'` is reached before falling to `'badge'`. (Expected per the hypothesis: it is skipped.)
- [ ] **Step 4:** Check the Firebase Storage source: does `media/university/{filename}` exist for these universities? (`cloudAsset` returns `null` when absent.) This decides Task 3.
- [ ] **Step 5:** Write down the confirmed cause in the commit message of Task 2.

---

### Task 2: Fix the fallback-chain race (deterministic stages + wait for cloudUrl)

**Files:**
- Modify: `src/components/onboarding/UniversityStep.jsx` (`UniversityLogo`)
- Test: `src/components/onboarding/UniversityLogo.test.jsx` (create)

**Interfaces:** unchanged. Internally: `nextStage` advances `cdn → cloud → local → badge` **unconditionally**; while in the `cloud` stage, if `cloudUrl` has resolved to `null` (or there is no `localImage` to derive it), auto-advance; only render the `<img>` when the current stage has a real `src`.

- [ ] **Step 1: Write the failing test** (mock `cloudAsset`; assert the chain reaches cloud and, when cloud is null, the badge — and that a resolved cloudUrl is used even if the CDN errors immediately)

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../utils/cloudAsset', () => ({
  cloudAsset: vi.fn(() => Promise.resolve('https://storage/x.png')),
}))
import { cloudAsset } from '../../utils/cloudAsset'
import { UniversityLogo } from './UniversityStep'   // export it for testing

const uni = { university_name_th: 'จุฬาลงกรณ์มหาวิทยาลัย', university_name_en: 'Chula', logo_url: 'https://cdn/bad.png' }

describe('UniversityLogo fallback chain', () => {
  beforeEach(() => cloudAsset.mockClear())

  it('falls from a failed CDN to the resolved cloud url (no race skip)', async () => {
    render(<UniversityLogo uni={uni} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://cdn/bad.png') // cdn first
    fireEvent.error(img)                                       // CDN 404s immediately
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://storage/x.png'), // cloud used, not skipped
    )
  })

  it('shows the text badge when every image source fails/absent', async () => {
    cloudAsset.mockResolvedValueOnce(null)
    render(<UniversityLogo uni={uni} />)
    fireEvent.error(screen.getByRole('img'))       // cdn → cloud (null) → local(none) → badge
    await waitFor(() => expect(screen.queryByRole('img')).toBeNull())
    expect(screen.getByText(/CU|Chula|จุฬา/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it, verify it fails** — `npm test -- UniversityLogo` → FAIL.

- [ ] **Step 3: Rewrite `UniversityLogo`** to remove the race:

```jsx
export function UniversityLogo({ uni }) {
  const legacy = legacyByName.get(uni.university_name_th)
  const localImage = legacy?.image ?? null

  const [cloudUrl, setCloudUrl] = useState(null)
  const [cloudResolved, setCloudResolved] = useState(false)
  useEffect(() => {
    if (!localImage) { setCloudResolved(true); return }   // no filename → no cloud candidate
    const filename = localImage.split('/').pop()
    cloudAsset(`media/university/${filename}`, { fallback: null })
      .then((url) => { setCloudUrl(url); setCloudResolved(true) })
  }, [localImage])

  const [stage, setStage] = useState('cdn')   // cdn → cloud → local → badge
  const advance = () => setStage((s) =>
    s === 'cdn' ? 'cloud' : s === 'cloud' ? 'local' : s === 'local' ? 'badge' : 'badge')

  // While in the cloud stage, wait for the async resolve; if it came back empty, advance.
  useEffect(() => {
    if (stage === 'cloud' && cloudResolved && !cloudUrl) advance()
  }, [stage, cloudResolved, cloudUrl])

  const src =
    stage === 'cdn'   ? uni.logo_url :
    stage === 'cloud' ? cloudUrl :
    stage === 'local' ? localImage : null

  // Render the image only when this stage has a usable src. In the cloud stage
  // before it resolves, render a neutral placeholder (not the badge) so we don't
  // prematurely give up on the cloud logo.
  if (src) {
    return (
      <img
        src={src}
        alt={uni.university_name_th}
        className="mx-auto h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 object-contain"
        onError={advance}
      />
    )
  }
  if (stage === 'cloud' && !cloudResolved) {
    return <div className="mx-auto h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-full bg-gray-100 animate-pulse" />
  }

  return (
    <div className="mx-auto flex h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-purple-500">
      <span className="pixel-font text-[9px] md:text-[11px] font-bold text-white">{badgeText(uni)}</span>
    </div>
  )
}
```

Also add `export` to `UniversityLogo` (it is currently a file-local function) so the test can import it.

- [ ] **Step 4: Run tests, verify pass** — `npm test -- UniversityLogo` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/components/onboarding/UniversityStep.jsx src/components/onboarding/UniversityLogo.test.jsx
git commit -m "fix(onboarding): university logo fallback race (cloud stage was skipped)"
```

---

### Task 3: Ensure a working logo source (branch on Task 1 findings)

Pick the branch that matches what Task 1 confirmed.

**If the MyTCAS CDN 404s / is blocked for most universities:**
- [ ] **Step A1:** Populate Firebase Storage so the `cloud` stage serves logos. Check `scripts/uploadAssets.mjs` / `scripts/pushToFirebase.mjs` for the `media/university/` prefix; upload the bundled `src/data`/asset logos there. (Owner-only script per CLAUDE.md — coordinate; do not commit `serviceAccountKey.json`.)
- [ ] **Step A2:** Verify `cloudAsset('media/university/{filename}')` resolves to a real URL for the affected universities; dev-check the logos now render at the cloud stage.

**If the CDN works (200) but logos still don't show:**
- [ ] **Step B1:** The bug is rendering/wiring, not the chain. Confirm `UniversityLogo` is actually mounted in the current University step (the redesign may have replaced it). Re-wire the logo into the restyled card and dev-check.

**If bundled local images are the reliable source:**
- [ ] **Step C1:** Ensure the legacy match key is correct — `legacyByName` is keyed on `uni.university_name_th`; if the live API's Thai name differs (spacing/suffix), the map misses and `localImage` is null. Add a normalized-name match (trim + collapse whitespace) so more universities resolve a `localImage`.

- [ ] **Commit** the chosen branch: `git commit -m "fix(onboarding): ensure a working university logo source"`

---

### Task 4: Regression verification

- [ ] **Step 1:** `npm test` — full suite green (incl. the new `UniversityLogo` test).
- [ ] **Step 2:** `npm run dev` — University step + Plan List cards + Profile: logos now render for universities that previously showed only a text badge. Confirm the badge still appears **only** when every source genuinely fails.
- [ ] **Step 3:** Confirm no console errors / infinite `onError` loops (the stage machine terminates at `badge`).

## Self-Review Checklist

- The `cloud` stage is no longer skipped by the async race (Task 2 waits for `cloudResolved`).
- Stage machine is monotonic `cdn → cloud → local → badge`; it always terminates (no error loop).
- `UniversityLogo` exported for testing; public rendering unchanged aside from the placeholder.
- The actual serving source is verified to work (Task 3), not just the fallback logic.
