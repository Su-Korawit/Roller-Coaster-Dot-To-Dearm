# Spotify Playlist Browsing + Device Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a connected user (1) browse their own Spotify playlists inside `PlayerSheet` — open a playlist, play the whole thing or a single track — and (2) pick which Spotify device the audio plays on (Spotify Connect transfer).

**Architecture:** Additive UI only. The API (`getMyPlaylists`, `getPlaylistTracks`, `getDevices`, `transferPlayback`) and store (`playlists`, `activePlaylistTracks`, `devices`, `device`, setters) already exist from the base Spotify feature. Add two focused components — `PlaylistBrowser` and `DevicePicker` — and wire them into `PlayerSheet` (a Search/Playlists tab toggle + a device row). Playing a whole playlist uses `play(token, { contextUri: playlist.uri })`; a single track uses `play(token, { uris: [track.uri] })`; switching device uses `transferPlayback(token, deviceId)`.

**Tech Stack:** React 19 + Vite, Zustand 5, Tailwind v4, Vitest + jsdom + @testing-library/react, lucide-react. Builds on `docs/superpowers/plans/2026-07-05-spotify-music-integration.md` and ADR-0010.

## Global Constraints

- **No TypeScript** — plain JS + JSX only.
- **Tailwind v4** token classes (`text-ink`, `bg-brand-soft`, `text-brand`, `text-accent-pink`); no config file.
- **Reuse existing seams** — call `spotifyApi` wrappers through `withFreshToken(fn)`; never fetch Spotify directly, never inline Firestore.
- **Shapes:** track `{ id, name, artists, albumArt, uri, durationMs }` (from `mapTrack`); playlist `{ id, name, imageUrl, uri }` (`uri` = context URI); device `{ id, name, isActive }` (from `getDevices`).
- **Error handling** — on any thrown `SpotifyError`, call `useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN')`; for playback, optimistic `setPlaying(true)` then roll back to `false` on failure (matches existing PlayerSheet pattern).
- **Test command:** `npm test`. Lint: `npm run lint` (repo has ~900 pre-existing warnings unrelated to this work — only ensure your new files add none).

---

### Task 1: PlaylistBrowser component

**Files:**
- Create: `src/components/music/PlaylistBrowser.jsx`
- Test: `src/components/music/PlaylistBrowser.test.jsx`

**Interfaces:**
- Consumes: `useMusicStore` (`playlists`, `activePlaylistTracks`, `setPlaylists`, `setActivePlaylistTracks`, `setPlaying`, `setError`), `withFreshToken`, `spotifyApi` (`getMyPlaylists`, `getPlaylistTracks`, `play`).
- Produces: default-export `PlaylistBrowser()` — on mount fetches playlists into the store and renders them as a grid. Tapping a playlist loads its tracks and shows a track list with a back button + "play all". Tapping a track plays just that track.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/music/PlaylistBrowser.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../../services/spotifyApi', () => ({
  getMyPlaylists: vi.fn(),
  getPlaylistTracks: vi.fn(),
  play: vi.fn().mockResolvedValue(),
}))

import PlaylistBrowser from './PlaylistBrowser'
import { useMusicStore } from '../../stores/useMusicStore'
import { getMyPlaylists, getPlaylistTracks, play } from '../../services/spotifyApi'

const PL = { id: 'p1', name: 'Focus', imageUrl: null, uri: 'spotify:playlist:p1' }
const TRACK = { id: 't1', name: 'Song', artists: 'A', albumArt: null, uri: 'spotify:track:t1', durationMs: 1000 }

beforeEach(() => {
  useMusicStore.getState().disconnect()
  getMyPlaylists.mockReset().mockResolvedValue([PL])
  getPlaylistTracks.mockReset().mockResolvedValue([TRACK])
  play.mockClear()
})

describe('PlaylistBrowser', () => {
  it('loads and lists the user playlists on mount', async () => {
    render(<PlaylistBrowser />)
    expect(await screen.findByText('Focus')).toBeInTheDocument()
    expect(getMyPlaylists).toHaveBeenCalledTimes(1)
  })

  it('opens a playlist and shows its tracks', async () => {
    render(<PlaylistBrowser />)
    fireEvent.click(await screen.findByText('Focus'))
    expect(await screen.findByText('Song')).toBeInTheDocument()
    expect(getPlaylistTracks).toHaveBeenCalledWith('AT', 'p1')
  })

  it('plays a single tapped track with its uri', async () => {
    render(<PlaylistBrowser />)
    fireEvent.click(await screen.findByText('Focus'))
    fireEvent.click(await screen.findByText('Song'))
    await waitFor(() => expect(play).toHaveBeenCalledWith('AT', { uris: ['spotify:track:t1'] }))
    expect(useMusicStore.getState().isPlaying).toBe(true)
  })

  it('play-all uses the playlist context uri', async () => {
    render(<PlaylistBrowser />)
    fireEvent.click(await screen.findByText('Focus'))
    fireEvent.click(await screen.findByRole('button', { name: /เล่นทั้งหมด/ }))
    await waitFor(() => expect(play).toHaveBeenCalledWith('AT', { contextUri: 'spotify:playlist:p1' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/music/PlaylistBrowser.test.jsx`
Expected: FAIL — cannot resolve `./PlaylistBrowser`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/music/PlaylistBrowser.jsx
import { useEffect, useState } from 'react'
import { ChevronLeft, Play } from 'lucide-react'
import { useMusicStore } from '../../stores/useMusicStore'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { getMyPlaylists, getPlaylistTracks, play } from '../../services/spotifyApi'

export default function PlaylistBrowser() {
  const playlists = useMusicStore((s) => s.playlists)
  const tracks = useMusicStore((s) => s.activePlaylistTracks)
  const [openId, setOpenId] = useState(null)

  // Load the user's playlists once when the browser mounts.
  useEffect(() => {
    let cancelled = false
    withFreshToken((t) => getMyPlaylists(t))
      .then((pls) => { if (!cancelled) useMusicStore.getState().setPlaylists(pls) })
      .catch((e) => useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN'))
    return () => { cancelled = true }
  }, [])

  const openPlaylist = async (pl) => {
    setOpenId(pl.id)
    useMusicStore.getState().setActivePlaylistTracks([])
    try {
      const list = await withFreshToken((t) => getPlaylistTracks(t, pl.id))
      useMusicStore.getState().setActivePlaylistTracks(list)
    } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const playAll = async (pl) => {
    useMusicStore.getState().setPlaying(true)
    try { await withFreshToken((t) => play(t, { contextUri: pl.uri })) }
    catch (e) { useMusicStore.getState().setPlaying(false); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const playTrack = async (track) => {
    useMusicStore.getState().setPlaying(true)
    try { await withFreshToken((t) => play(t, { uris: [track.uri] })) }
    catch (e) { useMusicStore.getState().setPlaying(false); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const openPl = playlists.find((p) => p.id === openId)

  if (openPl) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setOpenId(null)} aria-label="Back" className="text-brand"><ChevronLeft /></button>
          <span className="thai-font text-sm text-ink flex-1 truncate">{openPl.name}</span>
          <button
            onClick={() => playAll(openPl)}
            aria-label="เล่นทั้งหมด"
            className="pixel-font text-[9px] text-white bg-brand rounded-full px-3 py-1.5 flex items-center gap-1"
          >
            <Play size={12} /> เล่นทั้งหมด
          </button>
        </div>
        <ul className="flex flex-col divide-y divide-brand-soft">
          {tracks.map((t) => (
            <li key={t.id}>
              <button onClick={() => playTrack(t)} className="w-full text-left py-2 flex items-center gap-3">
                {t.albumArt && <img src={t.albumArt} alt="" className="w-10 h-10 rounded" />}
                <span className="flex flex-col min-w-0">
                  <span className="thai-font text-sm text-ink truncate">{t.name}</span>
                  <span className="thai-font text-xs text-gray-400 truncate">{t.artists}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3">
      {playlists.map((pl) => (
        <li key={pl.id}>
          <button onClick={() => openPlaylist(pl)} className="w-full text-left flex flex-col gap-1">
            {pl.imageUrl
              ? <img src={pl.imageUrl} alt="" className="w-full aspect-square rounded-lg object-cover" />
              : <div className="w-full aspect-square rounded-lg bg-brand-soft" />}
            <span className="thai-font text-xs text-ink truncate">{pl.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/music/PlaylistBrowser.test.jsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/music/PlaylistBrowser.jsx src/components/music/PlaylistBrowser.test.jsx
git commit -m "feat(music): PlaylistBrowser — list playlists, open tracks, play"
```

---

### Task 2: DevicePicker component

**Files:**
- Create: `src/components/music/DevicePicker.jsx`
- Test: `src/components/music/DevicePicker.test.jsx`

**Interfaces:**
- Consumes: `useMusicStore` (`devices`, `device`, `setDevices`, `setError`), `withFreshToken`, `spotifyApi` (`getDevices`, `transferPlayback`).
- Produces: default-export `DevicePicker()` — a collapsed row showing the current device name (or a "pick device" prompt). Tapping it expands a list, loading devices via `getDevices`. Tapping a device calls `transferPlayback`, re-loads devices, and collapses. A "refresh" action re-loads. Shows a hint when no devices are found.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/music/DevicePicker.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../../services/spotifyApi', () => ({
  getDevices: vi.fn(),
  transferPlayback: vi.fn().mockResolvedValue(),
}))

import DevicePicker from './DevicePicker'
import { useMusicStore } from '../../stores/useMusicStore'
import { getDevices, transferPlayback } from '../../services/spotifyApi'

const PHONE = { id: 'd1', name: 'iPhone', isActive: true }
const LAPTOP = { id: 'd2', name: 'MacBook', isActive: false }

beforeEach(() => {
  useMusicStore.getState().disconnect()
  getDevices.mockReset().mockResolvedValue([PHONE, LAPTOP])
  transferPlayback.mockClear()
})

describe('DevicePicker', () => {
  it('loads devices when expanded', async () => {
    render(<DevicePicker />)
    fireEvent.click(screen.getByRole('button', { name: /เลือกอุปกรณ์/ }))
    expect(await screen.findByText('MacBook')).toBeInTheDocument()
    expect(getDevices).toHaveBeenCalled()
  })

  it('transfers playback to a chosen device', async () => {
    render(<DevicePicker />)
    fireEvent.click(screen.getByRole('button', { name: /เลือกอุปกรณ์/ }))
    fireEvent.click(await screen.findByText('MacBook'))
    await waitFor(() => expect(transferPlayback).toHaveBeenCalledWith('AT', 'd2'))
  })

  it('shows a hint when no devices are available', async () => {
    getDevices.mockResolvedValue([])
    render(<DevicePicker />)
    fireEvent.click(screen.getByRole('button', { name: /เลือกอุปกรณ์/ }))
    expect(await screen.findByText(/ไม่พบอุปกรณ์/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/music/DevicePicker.test.jsx`
Expected: FAIL — cannot resolve `./DevicePicker`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/music/DevicePicker.jsx
import { useState } from 'react'
import { Speaker, RefreshCw, Check } from 'lucide-react'
import { useMusicStore } from '../../stores/useMusicStore'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { getDevices, transferPlayback } from '../../services/spotifyApi'

export default function DevicePicker() {
  const devices = useMusicStore((s) => s.devices)
  const device = useMusicStore((s) => s.device)
  const [open, setOpen] = useState(false)

  const loadDevices = async () => {
    try {
      const list = await withFreshToken((t) => getDevices(t))
      useMusicStore.getState().setDevices(list)
    } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next) await loadDevices()
  }

  const choose = async (d) => {
    try {
      await withFreshToken((t) => transferPlayback(t, d.id))
      await loadDevices()
      setOpen(false)
    } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={toggle} aria-label="เลือกอุปกรณ์" className="flex items-center gap-2 text-brand thai-font text-xs">
        <Speaker size={14} />
        <span className="truncate">{device?.name ?? 'เลือกอุปกรณ์เล่นเพลง'}</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1 rounded-xl bg-brand-soft p-2">
          {devices.length === 0 && (
            <li className="thai-font text-xs text-gray-500 px-1 py-1">ไม่พบอุปกรณ์ — เปิดแอป Spotify ในเครื่องก่อน</li>
          )}
          {devices.map((d) => (
            <li key={d.id}>
              <button onClick={() => choose(d)} className="w-full flex items-center gap-2 py-1.5 px-1 text-left">
                <Speaker size={14} className="text-brand" />
                <span className="thai-font text-sm text-ink flex-1 truncate">{d.name}</span>
                {d.isActive && <Check size={14} className="text-brand" />}
              </button>
            </li>
          ))}
          <li>
            <button onClick={loadDevices} className="w-full flex items-center gap-2 py-1.5 px-1 text-left text-brand thai-font text-xs">
              <RefreshCw size={12} /> รีเฟรชอุปกรณ์
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/music/DevicePicker.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/music/DevicePicker.jsx src/components/music/DevicePicker.test.jsx
git commit -m "feat(music): DevicePicker — list + transfer Spotify Connect devices"
```

---

### Task 3: Wire tabs + device picker into PlayerSheet

**Files:**
- Modify: `src/components/music/PlayerSheet.jsx`
- Modify: `src/components/music/PlayerSheet.test.jsx`

**Interfaces:**
- Consumes: `PlaylistBrowser` (Task 1), `DevicePicker` (Task 2).
- Produces: a local `view` state (`'search' | 'playlists'`, default `'search'`) with two tab buttons; `DevicePicker` shown above the tabs whenever connected. `'search'` renders the existing search input + results; `'playlists'` renders `<PlaylistBrowser/>`. Transport row stays visible in both views.

- [ ] **Step 1: Add the failing tests**

At the top of `src/components/music/PlayerSheet.test.jsx`, next to the other `vi.mock` calls, add mocks for the two child components so this test stays isolated:

```jsx
vi.mock('./PlaylistBrowser', () => ({ default: () => <div data-testid="playlist-browser" /> }))
vi.mock('./DevicePicker', () => ({ default: () => <div data-testid="device-picker" /> }))
```

Then add inside `describe('PlayerSheet', ...)`:

```jsx
  it('shows the device picker when connected', () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    render(<PlayerSheet />)
    expect(screen.getByTestId('device-picker')).toBeInTheDocument()
  })

  it('switches to the Playlists tab and renders PlaylistBrowser', () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    render(<PlayerSheet />)
    fireEvent.click(screen.getByRole('button', { name: /เพลย์ลิสต์/ }))
    expect(screen.getByTestId('playlist-browser')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/ค้นหาเพลง/)).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/music/PlayerSheet.test.jsx`
Expected: FAIL — no `device-picker` testid, no "เพลย์ลิสต์" button.

- [ ] **Step 3: Implement the tabs + device row**

In `src/components/music/PlayerSheet.jsx`:

Add imports:

```jsx
import PlaylistBrowser from './PlaylistBrowser'
import DevicePicker from './DevicePicker'
```

Add `view` state next to the existing `query` state:

```jsx
  const [view, setView] = useState('search')
```

Replace the connected-branch fragment (the `<>...</>` in the `status !== 'connected' ? (...) : (...)` ternary) with:

```jsx
          <>
            <DevicePicker />

            <div className="flex gap-2">
              <button
                onClick={() => setView('search')}
                className={`pixel-font text-[9px] rounded-full px-3 py-1.5 ${view === 'search' ? 'bg-brand text-white' : 'text-brand bg-brand-soft'}`}
              >
                ค้นหา
              </button>
              <button
                onClick={() => setView('playlists')}
                className={`pixel-font text-[9px] rounded-full px-3 py-1.5 ${view === 'playlists' ? 'bg-brand text-white' : 'text-brand bg-brand-soft'}`}
              >
                เพลย์ลิสต์
              </button>
            </div>

            {lastError === 'NO_ACTIVE_DEVICE' && (
              <p className="thai-font text-xs text-accent-pink">เปิดแอป Spotify ในเครื่องใดเครื่องหนึ่งก่อน แล้วลองใหม่</p>
            )}
            {lastError === 'PREMIUM_REQUIRED' && (
              <p className="thai-font text-xs text-accent-pink">ต้องใช้ Spotify Premium เพื่อควบคุมการเล่น</p>
            )}

            {view === 'search' ? (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาเพลง…"
                  className="w-full rounded-2xl border border-brand-soft px-4 py-2 thai-font"
                />
                <ul className="flex flex-col divide-y divide-brand-soft">
                  {results.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => onPlayTrack(t)} className="w-full text-left py-2 flex items-center gap-3">
                        {t.albumArt && <img src={t.albumArt} alt="" className="w-10 h-10 rounded" />}
                        <span className="flex flex-col min-w-0">
                          <span className="thai-font text-sm text-ink truncate">{t.name}</span>
                          <span className="thai-font text-xs text-gray-400 truncate">{t.artists}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <PlaylistBrowser />
            )}

            <div className="flex items-center justify-center gap-6 pt-2">
              <button onClick={control(previous)} aria-label="Previous"><SkipBack /></button>
              <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause /> : <Play />}</button>
              <button onClick={control(next)} aria-label="Next"><SkipForward /></button>
            </div>
          </>
```

(The search-effect `useEffect` at the top is unchanged — it already no-ops on empty `query`, which holds whenever the user is on the playlists tab.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/music/PlayerSheet.test.jsx`
Expected: PASS — the two original tests (connect button, search→play) plus the two new ones.

- [ ] **Step 5: Full suite + lint**

Run: `npm test`
Expected: whole suite green.
Run: `npm run lint`
Expected: no new warnings from the three touched/created music files.

- [ ] **Step 6: Commit**

```bash
git add src/components/music/PlayerSheet.jsx src/components/music/PlayerSheet.test.jsx
git commit -m "feat(music): PlayerSheet tabs (search/playlists) + device picker row"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Drive it** (dev server on `http://127.0.0.1:5173`, connected Premium account, at least two Spotify devices open — e.g. phone + desktop app)

1. MiniPlayer → PlayerSheet → the current device name shows at the top.
2. Tap the device row → your devices list; tap another device → audio jumps to it (Spotify Connect transfer), the check mark moves.
3. Tap **เพลย์ลิสต์** → playlists grid; open one → tap **เล่นทั้งหมด** → playlist starts; tap a single track → that track plays.
4. Tap **ค้นหา** → search still works.
5. With all Spotify devices closed, open the device row → "ไม่พบอุปกรณ์…" hint appears.

- [ ] **Step 2: Note it in the spec + commit**

In `docs/superpowers/specs/2026-07-05-spotify-music-integration-design.md`, under "Verified", append: `Playlist browsing + device switching added 2026-07-05 (plan: 2026-07-05-spotify-playlist-and-device.md).` Then:

```bash
git add docs/superpowers/specs/2026-07-05-spotify-music-integration-design.md
git commit -m "docs(music): note playlist browsing + device switching shipped"
```

---

## Self-Review

- **Spec coverage:** playlist grid + open→tracks + play-all + single-track (T1); device list + transfer + empty hint (T2); Search/Playlists toggle + device row wiring (T3); manual verify (T4). Delivers the design's "browse own playlists" scope line plus the newly-requested device switching.
- **Type consistency:** playlist `{ id, name, imageUrl, uri }` matches `getMyPlaylists`; track `{ id, name, artists, albumArt, uri, durationMs }` matches `mapTrack`; device `{ id, name, isActive }` matches `getDevices`. `play(token, { uris })` / `play(token, { contextUri })` and `transferPlayback(token, deviceId)` match `spotifyApi` signatures. `withFreshToken(fn)` passes the token first everywhere.
- **Placeholder scan:** no TBD/TODO; every code step is complete.
