# Unified Music Panel (Background + Spotify Full-Function) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Music surface: the HomePage music pill opens a single panel with a **Background** tab (the existing admin-curated chapter list) and a **Spotify** tab (the full Connect feature set — now-playing, transport, search, playlists, devices, plus new queue/shuffle/repeat).

**Architecture:** The Spotify feature body currently lives inside `PlayerSheet` (a bottom-sheet Popup). Extract it into a reusable `SpotifyControls` component; `PlayerSheet` becomes a thin Popup wrapper around it (MiniPlayer flow unchanged). The HomePage `trackList` popup's JSX moves into a props-driven `BackgroundMusicTab`. A new `MusicPanel` composes both under a tab bar and replaces the old trackList popup. Three new thin wrappers in `spotifyApi.js` (queue/shuffle/repeat) complete "full function".

**Tech Stack:** existing `spotifyApi.js` + `withFreshToken` + `useMusicStore` (ADR-0010 Connect-remote model), Vitest + jsdom, React, `Popup` shell.

## Global Constraints

- **No TypeScript**; Thai student-facing copy; existing tokens only.
- **ADR-0010 invariants hold**: the app is a Connect *remote* — it plays no Spotify audio itself; Premium required; `NO_ACTIVE_DEVICE` handled by DevicePicker. Do not add a Web Playback SDK.
- **Do not break the MiniPlayer flow** — `PlayerSheet` keeps its export and its Popup behavior; only its body moves.
- **`spotifyApi.js` stays a thin token-first wrapper layer** — new functions follow the exact `spotifyFetch` style; tests mirror `spotifyApi.test.js` prior art (mock global fetch).
- **Zustand selectors select raw store fields only** (commit `e1d67fe`).
- **The Background audio element and its handlers stay in HomePage** (they must survive panel unmount); `MusicPanel` receives them as props.

**Background:** Master roadmap item 3 (user item 6). Already built: debounced search, playlists, devices, transport, seek/volume wrappers. Missing: queue/shuffle/repeat, and the unification — today the pill opens a Background-only popup while Spotify hides behind MiniPlayer.

---

### Task 1: `spotifyApi` — queue, shuffle, repeat

**Files:**
- Modify: `src/services/spotifyApi.js`
- Modify: `src/services/spotifyApi.test.js`

**Interfaces:**
- Produces: `queueTrack(accessToken, uri)` → POST `/me/player/queue?uri=...`; `setShuffle(accessToken, state)` → PUT `/me/player/shuffle?state=true|false`; `setRepeat(accessToken, state)` → PUT `/me/player/repeat?state=track|context|off`.

- [ ] **Step 1: Write the failing tests**

Open `src/services/spotifyApi.test.js`, note how existing cases stub `fetch` and assert URL/method, and append in the same style:

```js
describe('queue / shuffle / repeat', () => {
  it('queueTrack POSTs the encoded uri', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' })
    vi.stubGlobal('fetch', fetchSpy)
    await queueTrack('tok', 'spotify:track:abc123')
    const [url, opts] = fetchSpy.mock.calls[0]
    expect(url).toContain('/me/player/queue?uri=spotify%3Atrack%3Aabc123')
    expect(opts.method).toBe('POST')
  })

  it('setShuffle PUTs the state flag', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' })
    vi.stubGlobal('fetch', fetchSpy)
    await setShuffle('tok', true)
    const [url, opts] = fetchSpy.mock.calls[0]
    expect(url).toContain('/me/player/shuffle?state=true')
    expect(opts.method).toBe('PUT')
  })

  it('setRepeat PUTs the repeat mode', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 204, text: async () => '' })
    vi.stubGlobal('fetch', fetchSpy)
    await setRepeat('tok', 'context')
    const [url, opts] = fetchSpy.mock.calls[0]
    expect(url).toContain('/me/player/repeat?state=context')
    expect(opts.method).toBe('PUT')
  })
})
```

(Add `queueTrack, setShuffle, setRepeat` to the test file's import from `./spotifyApi`.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/services/spotifyApi.test.js` → 3 new FAIL.

- [ ] **Step 3: Implement** — append to `src/services/spotifyApi.js`:

```js
export const queueTrack = (accessToken, uri) =>
  spotifyFetch(accessToken, `/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: 'POST' })
export const setShuffle = (accessToken, state) =>
  spotifyFetch(accessToken, `/me/player/shuffle?state=${state ? 'true' : 'false'}`, { method: 'PUT' })
export const setRepeat = (accessToken, state) =>
  spotifyFetch(accessToken, `/me/player/repeat?state=${state}`, { method: 'PUT' })
```

- [ ] **Step 4: Run to verify pass** — same command → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/services/spotifyApi.js src/services/spotifyApi.test.js
git commit -m "feat(music): queue, shuffle, repeat Spotify API wrappers"
```

---

### Task 2: Extract `SpotifyControls` out of `PlayerSheet`

**Files:**
- Create: `src/components/music/SpotifyControls.jsx`
- Modify: `src/components/music/PlayerSheet.jsx`
- Modify: `src/components/music/PlayerSheet.test.jsx` (only if it breaks — behavior is unchanged)

**Interfaces:**
- Produces: `<SpotifyControls />` — everything currently inside `PlayerSheet`'s `<Popup>` body: the not-connected connect button, `DevicePicker`, search/playlists view toggle, debounced search, track rows, transport row. Self-contained (reads `useMusicStore` itself, exactly as the code does today). `PlayerSheet` becomes:

```jsx
// src/components/music/PlayerSheet.jsx
import Popup from '../ui/Popup'
import { useMusicStore } from '../../stores/useMusicStore'
import SpotifyControls from './SpotifyControls'

export default function PlayerSheet() {
  const closeSheet = useMusicStore((s) => s.closeSheet)
  return (
    <Popup variant="sheet" size="md" onClose={closeSheet}>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        <SpotifyControls />
      </div>
    </Popup>
  )
}
```

- [ ] **Step 1: Move the body** — cut everything inside `PlayerSheet`'s `<div className="p-4 ...">` (plus the hooks/handlers/imports it uses: the debounce effect, `onPlayTrack`, `control`, `togglePlay`, all `useMusicStore` selectors except `closeSheet`) into the new `SpotifyControls.jsx`, exporting it as default. Leave `PlayerSheet` as the thin wrapper above. **Move code verbatim — no behavior edits in this task.**
- [ ] **Step 2: Run the existing suite** — `npx vitest run src/components/music/` → all existing music tests PASS unchanged (they render `PlayerSheet`/`MiniPlayer`, whose observable behavior is identical). If an import path inside a test breaks, fix the path only.
- [ ] **Step 3: Commit**

```bash
git add src/components/music/SpotifyControls.jsx src/components/music/PlayerSheet.jsx src/components/music/PlayerSheet.test.jsx
git commit -m "refactor(music): extract SpotifyControls from PlayerSheet (no behavior change)"
```

---

### Task 3: Queue / shuffle / repeat in `SpotifyControls`

**Files:**
- Modify: `src/components/music/SpotifyControls.jsx`
- Create: `src/components/music/SpotifyControls.test.jsx`

**Interfaces:**
- Produces: each search/playlist track row gains a queue button (`aria-label="เพิ่มเข้าคิว"` → `queueTrack(uri)`); the transport row gains shuffle (`aria-label="สุ่มเพลง"`, toggles local boolean → `setShuffle`) and repeat (`aria-label="เล่นซ้ำ"`, cycles `off → context → track` → `setRepeat`) buttons using `Shuffle`/`Repeat`/`Repeat1` lucide icons, active state `text-brand-strong`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/music/SpotifyControls.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

let musicState
vi.mock('../../stores/useMusicStore', () => ({
  useMusicStore: Object.assign((sel) => sel(musicState), { getState: () => musicState }),
}))
const api = vi.hoisted(() => ({
  queueTrack: vi.fn(), setShuffle: vi.fn(), setRepeat: vi.fn(),
  searchTracks: vi.fn(), play: vi.fn(), pause: vi.fn(), next: vi.fn(), previous: vi.fn(),
}))
vi.mock('../../services/spotifyApi', () => api)
vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('tok') }))
vi.mock('../../services/spotifyConnect', () => ({ startConnect: vi.fn() }))
vi.mock('./PlaylistBrowser', () => ({ default: () => <div data-testid="playlists" /> }))
vi.mock('./DevicePicker', () => ({ default: () => <div data-testid="devices" /> }))

const { default: SpotifyControls } = await import('./SpotifyControls')

describe('SpotifyControls queue/shuffle/repeat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    musicState = {
      status: 'connected', isPlaying: false, lastError: null,
      searchResults: [{ id: 't1', name: 'Song', artists: 'A', albumArt: null, uri: 'spotify:track:t1', durationMs: 1000 }],
      setSearchResults: vi.fn(), setPlaying: vi.fn(), setError: vi.fn(), closeSheet: vi.fn(),
    }
  })

  it('queues a track from its row button', async () => {
    render(<SpotifyControls />)
    fireEvent.click(screen.getByLabelText('เพิ่มเข้าคิว'))
    expect(api.queueTrack).toHaveBeenCalledWith('tok', 'spotify:track:t1')
  })

  it('toggles shuffle', () => {
    render(<SpotifyControls />)
    fireEvent.click(screen.getByLabelText('สุ่มเพลง'))
    expect(api.setShuffle).toHaveBeenCalledWith('tok', true)
  })

  it('cycles repeat off → context → track', () => {
    render(<SpotifyControls />)
    const btn = screen.getByLabelText('เล่นซ้ำ')
    fireEvent.click(btn)
    expect(api.setRepeat).toHaveBeenCalledWith('tok', 'context')
    fireEvent.click(btn)
    expect(api.setRepeat).toHaveBeenCalledWith('tok', 'track')
    fireEvent.click(btn)
    expect(api.setRepeat).toHaveBeenCalledWith('tok', 'off')
  })
})
```

(If `SpotifyControls`'s actual internal structure differs from these mocks — e.g. extra selectors — extend `musicState` with whatever the component reads; keep assertions unchanged.)

- [ ] **Step 2: Run to verify failure** — the three new cases FAIL (labels absent).
- [ ] **Step 3: Implement** — in `SpotifyControls.jsx`: import the new API fns + `Shuffle, Repeat, Repeat1` icons; add `const [shuffleOn, setShuffleOn] = useState(false)` and `const [repeatMode, setRepeatMode] = useState('off')`; add the queue button to each track row (`onClick={(e) => { e.stopPropagation(); withFreshToken((t) => queueTrack(t, track.uri)).catch((err) => useMusicStore.getState().setError(err?.reason ?? 'UNKNOWN')) }}`); add shuffle/repeat buttons beside the transport controls:

```jsx
              <button
                aria-label="สุ่มเพลง"
                onClick={() => {
                  const nextVal = !shuffleOn
                  setShuffleOn(nextVal)
                  withFreshToken((t) => setShuffle(t, nextVal)).catch((e) => useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN'))
                }}
                className={shuffleOn ? 'text-brand-strong' : 'text-ink-soft'}
              >
                <Shuffle size={16} />
              </button>
              <button
                aria-label="เล่นซ้ำ"
                onClick={() => {
                  const order = ['off', 'context', 'track']
                  const nextMode = order[(order.indexOf(repeatMode) + 1) % 3]
                  setRepeatMode(nextMode)
                  withFreshToken((t) => setRepeat(t, nextMode)).catch((e) => useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN'))
                }}
                className={repeatMode !== 'off' ? 'text-brand-strong' : 'text-ink-soft'}
              >
                {repeatMode === 'track' ? <Repeat1 size={16} /> : <Repeat size={16} />}
              </button>
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/components/music/` → all PASS.
- [ ] **Step 5: Commit**

```bash
git add src/components/music/SpotifyControls.jsx src/components/music/SpotifyControls.test.jsx
git commit -m "feat(music): queue, shuffle, repeat controls in SpotifyControls"
```

---

### Task 4: `BackgroundMusicTab` + `MusicPanel`

**Files:**
- Create: `src/components/music/BackgroundMusicTab.jsx`
- Create: `src/components/music/MusicPanel.jsx`
- Create: `src/components/music/MusicPanel.test.jsx`

**Interfaces:**
- `<BackgroundMusicTab tracks currentTrackIdx isPlaying onTogglePlay onSelectTrack />` — the JSX currently inside HomePage's `{activePopup === 'trackList' && (...)}` block (header with play/pause + the track list), **minus** the outer positioned wrapper; purely props-driven, no store access.
- `<MusicPanel onClose tracks currentTrackIdx isPlaying onTogglePlay onSelectTrack />` — positioned card (same placement classes as the old trackList popup: `absolute bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-sm md:max-w-md neo-card ... max-h-[65vh]`, `zIndex: Z_NAV`) with a two-tab bar — `Background` | `Spotify` — rendering `BackgroundMusicTab` (props passed through) or `SpotifyControls`, plus a close button (`aria-label="ปิด"`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/music/MusicPanel.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./SpotifyControls', () => ({ default: () => <div data-testid="spotify-controls" /> }))

const { default: MusicPanel } = await import('./MusicPanel')

const PROPS = {
  onClose: vi.fn(),
  tracks: [{ title: 'Chapter 1', start: 0 }, { title: 'Chapter 2', start: 60 }],
  currentTrackIdx: 0,
  isPlaying: false,
  onTogglePlay: vi.fn(),
  onSelectTrack: vi.fn(),
}

describe('MusicPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the Background tab by default with the track list', () => {
    render(<MusicPanel {...PROPS} />)
    expect(screen.getByText('Chapter 1')).toBeTruthy()
    expect(screen.queryByTestId('spotify-controls')).toBeNull()
  })

  it('switches to the Spotify tab', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByText('Spotify'))
    expect(screen.getByTestId('spotify-controls')).toBeTruthy()
    expect(screen.queryByText('Chapter 1')).toBeNull()
  })

  it('selecting a background track calls onSelectTrack with its index', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByText('Chapter 2'))
    expect(PROPS.onSelectTrack).toHaveBeenCalledWith(1)
  })

  it('play/pause button calls onTogglePlay', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByLabelText('เล่นเพลง'))
    expect(PROPS.onTogglePlay).toHaveBeenCalled()
  })

  it('close button calls onClose', () => {
    render(<MusicPanel {...PROPS} />)
    fireEvent.click(screen.getByLabelText('ปิด'))
    expect(PROPS.onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify failure** — module not found.
- [ ] **Step 3: Implement** — build `BackgroundMusicTab.jsx` by moving the trackList JSX from HomePage (find it under the `{/* ── TRACKLIST PANEL ── */}` comment; convert `handleTogglePlay`→`onTogglePlay`, `handleSelectTrack`→`onSelectTrack(i)`, keep the `aria-label={isPlaying ? 'หยุดเพลง' : 'เล่นเพลง'}` button). Then `MusicPanel.jsx`:

```jsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { Z_NAV } from '../../constants/zIndex'
import BackgroundMusicTab from './BackgroundMusicTab'
import SpotifyControls from './SpotifyControls'

export default function MusicPanel({ onClose, tracks, currentTrackIdx, isPlaying, onTogglePlay, onSelectTrack }) {
  const [tab, setTab] = useState('background')
  return (
    <div
      className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[90%] max-w-sm md:max-w-md neo-card flex flex-col overflow-hidden max-h-[65vh]"
      style={{ zIndex: Z_NAV }}
    >
      <div className="flex items-center border-b-2 border-ink shrink-0">
        {[{ key: 'background', label: 'Background' }, { key: 'spotify', label: 'Spotify' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 pixel-font text-[9px] ${tab === t.key ? 'text-brand-strong bg-brand-soft' : 'text-ink-soft'}`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={onClose} aria-label="ปิด" className="px-3 text-ink-soft hover:text-ink">
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="overflow-y-auto">
        {tab === 'background' ? (
          <BackgroundMusicTab
            tracks={tracks}
            currentTrackIdx={currentTrackIdx}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onSelectTrack={onSelectTrack}
          />
        ) : (
          <div className="p-4"><SpotifyControls /></div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run src/components/music/MusicPanel.test.jsx` → PASS, 5 tests.
- [ ] **Step 5: Commit**

```bash
git add src/components/music/BackgroundMusicTab.jsx src/components/music/MusicPanel.jsx src/components/music/MusicPanel.test.jsx
git commit -m "feat(music): unified MusicPanel with Background and Spotify tabs"
```

---

### Task 5: HomePage swap + verification

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Replace the trackList popup** — in `HomePage.jsx`: import `MusicPanel` (`import MusicPanel from '../components/music/MusicPanel'`); delete the entire `{/* ── TRACKLIST PANEL ── */}` block (its JSX now lives in `BackgroundMusicTab`) and render instead:

```jsx
      {activePopup === 'trackList' && (
        <MusicPanel
          onClose={closePopup}
          tracks={tracks}
          currentTrackIdx={currentTrackIdx}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onSelectTrack={handleSelectTrack}
        />
      )}
```

Keep the popup key `'trackList'` so the pill toggle logic in `handleTabChange` keeps working untouched. The `<audio>` element and `handleTogglePlay`/`handleSelectTrack` stay in HomePage.

- [ ] **Step 2: Full suite + lint** — `npm test` (isolate-re-run unrelated flaky files) and `npm run lint` (zero errors in touched files).
- [ ] **Step 3: Manual walkthrough** — `npm run dev`: pill opens the panel on the Background tab; chapters play/pause/select as before; Spotify tab shows connect state (or full controls when connected: search, playlists, queue button on rows, shuffle/repeat lighting up); MiniPlayer + its PlayerSheet still work. On a Premium account with the Spotify app open, queue a track and confirm it plays next.
- [ ] **Step 4: Docs** — in `CONTEXT.md` Domain Vocabulary, update the **MiniPlayer / PlayerSheet** row's description to end with: `PlayerSheet's body is the reusable **SpotifyControls**, also embedded in **MusicPanel** (the unified Background + Spotify panel the HomePage music pill opens)`.
- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.jsx CONTEXT.md
git commit -m "feat(music): music pill opens the unified MusicPanel"
```

---

## Out of Scope

- Web Playback SDK / in-app audio for Spotify (ADR-0010: Connect remote only).
- Cross-fading Background ↔ Spotify or auto-pausing one when the other plays.
- Podcast/audiobook search types; liked-songs library sync.

---

## Cursor Prompt (single conversation, pre-authorized)

> Read `docs/superpowers/plans/2026-07-09-music-spotify.md` and execute **ALL tasks (1–5) in order**, exactly as written, TDD, committing after each task with the exact messages given. The owner has pre-authorized every command — run directly; only stop on errors. Task 2 is a verbatim code MOVE (no behavior edits); the existing music tests must pass unchanged after it. CRITICAL: Zustand selectors select raw store fields only (see commit `e1d67fe`). Do the manual walkthrough in Task 5 Step 3 as far as possible without a Premium account and report what you verified vs. couldn't. Then run the full `npm test` suite and report final counts verbatim.
