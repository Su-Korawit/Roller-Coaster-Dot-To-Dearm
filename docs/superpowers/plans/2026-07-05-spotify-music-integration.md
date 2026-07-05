# Spotify Music Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user connect Spotify and use the app as a Connect remote — search any track, browse their playlists, and control playback (play/pause/next/prev/volume) on their own Spotify device.

**Architecture:** Pure client-side **Authorization Code + PKCE** (no client secret, no backend proxy — Spotify's token endpoint and Web API allow CORS from the SPA). Refresh token persists in the Firestore private subcollection `users/{uid}/private/spotify`. A persistent `MiniPlayer` in `MobileLayout` expands into a `PlayerSheet`. Now-playing comes from polling `getPlaybackState` (~5s) since Connect has no push channel.

**Tech Stack:** React 19 + Vite, Zustand 5, React Router 7, Firebase 12 (Firestore), Tailwind v4, Vitest + jsdom + @testing-library/react. See spec `docs/superpowers/specs/2026-07-05-spotify-music-integration-design.md` and `docs/adr/0010-spotify-connect-remote-integration.md`.

## Global Constraints

- **No TypeScript** — plain JS + JSX only. No type annotations, no `.ts`.
- **Tailwind v4** — tokens in `src/index.css` `@theme`; no config file. Use token classes (`text-brand`, `bg-surface`).
- **Firebase paths only via `src/lib/db.js`** — never inline `doc(db, ...)`. Add new refs/shapes there.
- **Firestore writes** — the Spotify connection is written on connect/disconnect only (not high-frequency), so a plain `setDoc`/`deleteDoc` through the `db.js` refs is correct here; do NOT route it through `syncManager` (that is for debounced store mirrors).
- **Secrets** — `VITE_SPOTIFY_CLIENT_ID` is public (PKCE, no secret). Never introduce a Spotify client secret into the client.
- **Zustand** — one store per concern in `src/stores/`; selector pattern `useStore((s) => s.x)`; setter verbs; `persist` with an `rc-*` name; never persist tokens.
- **Test command:** `npm test` (Vitest, jsdom). Rules: `npm run test:rules`.
- **Refresh token MUST live in `users/{uid}/private/spotify`**, never the top-level user doc (user docs are readable by all signed-in users).
- **Scopes (verbatim):** `user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative`.

---

### Task 1: Spotify constants + env

**Files:**
- Create: `src/constants/spotify.js`
- Modify: `.env.example` (create if absent)
- Test: `src/constants/spotify.test.js`

**Interfaces:**
- Produces: `SPOTIFY_SCOPES` (string[]), `SPOTIFY_AUTH_URL`, `SPOTIFY_TOKEN_URL`, `SPOTIFY_API_BASE` (strings), `clientId()` → string, `redirectUri()` → string.

- [ ] **Step 1: Write the failing test**

```js
// src/constants/spotify.test.js
import { describe, it, expect, vi } from 'vitest'
import { SPOTIFY_SCOPES, SPOTIFY_AUTH_URL, SPOTIFY_TOKEN_URL, SPOTIFY_API_BASE, redirectUri } from './spotify'

describe('spotify constants', () => {
  it('exposes the exact required scopes', () => {
    expect(SPOTIFY_SCOPES).toEqual([
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'playlist-read-private',
      'playlist-read-collaborative',
    ])
  })

  it('points at Spotify accounts + api hosts', () => {
    expect(SPOTIFY_AUTH_URL).toBe('https://accounts.spotify.com/authorize')
    expect(SPOTIFY_TOKEN_URL).toBe('https://accounts.spotify.com/api/token')
    expect(SPOTIFY_API_BASE).toBe('https://api.spotify.com/v1')
  })

  it('builds redirectUri from the current origin', () => {
    vi.stubGlobal('location', { origin: 'https://example.app' })
    expect(redirectUri()).toBe('https://example.app/music/callback')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/constants/spotify.test.js`
Expected: FAIL — cannot resolve `./spotify`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/constants/spotify.js
// Spotify Web API / OAuth constants. Client-side PKCE — client id is public,
// there is NO client secret. See docs/adr/0010.
export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
export const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
]

export function clientId() {
  const id = import.meta.env.VITE_SPOTIFY_CLIENT_ID
  if (!id) console.error('[spotify] missing VITE_SPOTIFY_CLIENT_ID — ตรวจ .env แล้ว restart dev server')
  return id
}

export function redirectUri() {
  return `${location.origin}/music/callback`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/constants/spotify.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Add env example**

Append to `.env.example` (create the file if it does not exist):

```
# Spotify (Music feature) — public client id, PKCE flow, no secret.
# Register redirect URIs in the Spotify dashboard (localhost is rejected as
# "not secure" — use the 127.0.0.1 loopback IP, and open dev at 127.0.0.1:5173):
#   http://127.0.0.1:5173/music/callback  and  <prod-origin>/music/callback
VITE_SPOTIFY_CLIENT_ID=
```

- [ ] **Step 6: Commit**

```bash
git add src/constants/spotify.js src/constants/spotify.test.js .env.example
git commit -m "feat(music): add Spotify constants + env scaffold"
```

---

### Task 2: PKCE auth library

**Files:**
- Create: `src/lib/spotifyAuth.js`
- Test: `src/lib/spotifyAuth.test.js`

**Interfaces:**
- Consumes: `SPOTIFY_AUTH_URL`, `SPOTIFY_TOKEN_URL`, `SPOTIFY_SCOPES`, `clientId`, `redirectUri` from `src/constants/spotify.js`.
- Produces:
  - `generateCodeVerifier()` → string (64 chars, `[A-Za-z0-9-._~]`)
  - `generateCodeChallenge(verifier)` → `Promise<string>` (base64url of SHA-256)
  - `buildAuthUrl({ state, codeChallenge })` → string
  - `exchangeCodeForTokens({ code, codeVerifier })` → `Promise<{ accessToken, refreshToken, expiresIn }>`
  - `refreshAccessToken(refreshToken)` → `Promise<{ accessToken, refreshToken, expiresIn }>`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/spotifyAuth.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCodeVerifier, generateCodeChallenge, buildAuthUrl, exchangeCodeForTokens, refreshAccessToken } from './spotifyAuth'

vi.mock('../constants/spotify', () => ({
  SPOTIFY_AUTH_URL: 'https://accounts.spotify.com/authorize',
  SPOTIFY_TOKEN_URL: 'https://token.test/api/token',
  SPOTIFY_SCOPES: ['scope-a', 'scope-b'],
  clientId: () => 'CLIENT123',
  redirectUri: () => 'https://example.app/music/callback',
}))

describe('spotifyAuth PKCE', () => {
  it('code verifier is 64 url-safe chars', () => {
    const v = generateCodeVerifier()
    expect(v).toHaveLength(64)
    expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })

  it('code challenge is deterministic base64url of SHA-256', async () => {
    const c = await generateCodeChallenge('abc')
    // base64url has no +, /, or = padding
    expect(c).not.toMatch(/[+/=]/)
    expect(await generateCodeChallenge('abc')).toBe(c)
  })

  it('buildAuthUrl includes required params', () => {
    const url = new URL(buildAuthUrl({ state: 'st8', codeChallenge: 'chal' }))
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    const p = url.searchParams
    expect(p.get('client_id')).toBe('CLIENT123')
    expect(p.get('response_type')).toBe('code')
    expect(p.get('redirect_uri')).toBe('https://example.app/music/callback')
    expect(p.get('code_challenge_method')).toBe('S256')
    expect(p.get('code_challenge')).toBe('chal')
    expect(p.get('state')).toBe('st8')
    expect(p.get('scope')).toBe('scope-a scope-b')
  })

  it('exchangeCodeForTokens posts form body and maps snake_case', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const out = await exchangeCodeForTokens({ code: 'CODE', codeVerifier: 'VER' })
    expect(out).toEqual({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600 })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://token.test/api/token')
    expect(opts.method).toBe('POST')
    const body = new URLSearchParams(opts.body)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('CODE')
    expect(body.get('code_verifier')).toBe('VER')
    expect(body.get('client_id')).toBe('CLIENT123')
  })

  it('refreshAccessToken keeps old refresh token when Spotify omits it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'AT2', expires_in: 3600 }),
    }))
    const out = await refreshAccessToken('OLD_RT')
    expect(out).toEqual({ accessToken: 'AT2', refreshToken: 'OLD_RT', expiresIn: 3600 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/spotifyAuth.test.js`
Expected: FAIL — cannot resolve `./spotifyAuth`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/spotifyAuth.js
// Authorization Code + PKCE. No client secret (public client). See docs/adr/0010.
import { SPOTIFY_AUTH_URL, SPOTIFY_TOKEN_URL, SPOTIFY_SCOPES, clientId, redirectUri } from '../constants/spotify'

const VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

export function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(64))
  return Array.from(bytes, (b) => VERIFIER_CHARS[b % VERIFIER_CHARS.length]).join('')
}

function base64url(bytes) {
  let str = ''
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}

export function buildAuthUrl({ state, codeChallenge }) {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state,
    scope: SPOTIFY_SCOPES.join(' '),
  })
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`
}

async function postToken(body) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error(`spotify token endpoint ${res.status}`)
  return res.json()
}

export async function exchangeCodeForTokens({ code, codeVerifier }) {
  const data = await postToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: clientId(),
    code_verifier: codeVerifier,
  })
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in }
}

export async function refreshAccessToken(refreshToken) {
  const data = await postToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId(),
  })
  // Spotify may or may not return a new refresh token; keep the old one if absent.
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? refreshToken, expiresIn: data.expires_in }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/spotifyAuth.test.js`
Expected: PASS (5 tests). jsdom provides `crypto.subtle`, `btoa`, `TextEncoder`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/spotifyAuth.js src/lib/spotifyAuth.test.js
git commit -m "feat(music): PKCE auth helpers for Spotify"
```

---

### Task 3: Spotify Web API wrapper + error classification

**Files:**
- Create: `src/services/spotifyApi.js`
- Test: `src/services/spotifyApi.test.js`

**Interfaces:**
- Consumes: `SPOTIFY_API_BASE` from constants.
- Produces:
  - `class SpotifyError extends Error { status, reason }` — `reason` ∈ `'PREMIUM_REQUIRED' | 'NO_ACTIVE_DEVICE' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'UNKNOWN'`
  - `spotifyFetch(accessToken, endpoint, { method, body } = {})` → `Promise<any>` (parsed JSON or `null` for 204)
  - `searchTracks(accessToken, q)` → `Promise<track[]>` where `track = { id, name, artists, albumArt, uri, durationMs }`
  - `getMyPlaylists(accessToken)` → `Promise<{ id, name, imageUrl, uri }[]>`
  - `getPlaylistTracks(accessToken, playlistId)` → `Promise<track[]>`
  - `getDevices(accessToken)` → `Promise<{ id, name, isActive }[]>`
  - `getPlaybackState(accessToken)` → `Promise<{ isPlaying, track, progressMs, device, volumePercent } | null>`
  - `transferPlayback(accessToken, deviceId)` → `Promise<void>`
  - `play(accessToken, { uris, contextUri, deviceId } = {})` → `Promise<void>`
  - `pause(accessToken)` / `next(accessToken)` / `previous(accessToken)` → `Promise<void>`
  - `seek(accessToken, positionMs)` / `setVolume(accessToken, percent)` → `Promise<void>`

- [ ] **Step 1: Write the failing test**

```js
// src/services/spotifyApi.test.js
import { describe, it, expect, vi } from 'vitest'
import { spotifyFetch, SpotifyError, searchTracks, play, pause } from './spotifyApi'

function res({ ok = true, status = 200, json = {}, text = '' }) {
  return { ok, status, json: () => Promise.resolve(json), text: () => Promise.resolve(text) }
}

describe('spotifyFetch error classification', () => {
  it('403 → PREMIUM_REQUIRED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: false, status: 403, text: 'x' })))
    await expect(spotifyFetch('AT', '/me/player/play', { method: 'PUT' }))
      .rejects.toMatchObject({ status: 403, reason: 'PREMIUM_REQUIRED' })
  })

  it('404 with reason NO_ACTIVE_DEVICE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      res({ ok: false, status: 404, text: JSON.stringify({ error: { reason: 'NO_ACTIVE_DEVICE' } }) })
    ))
    await expect(spotifyFetch('AT', '/me/player/play', { method: 'PUT' }))
      .rejects.toMatchObject({ status: 404, reason: 'NO_ACTIVE_DEVICE' })
  })

  it('429 → RATE_LIMITED, 401 → UNAUTHORIZED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: false, status: 429, text: '' })))
    await expect(spotifyFetch('AT', '/x')).rejects.toMatchObject({ reason: 'RATE_LIMITED' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: false, status: 401, text: '' })))
    await expect(spotifyFetch('AT', '/x')).rejects.toMatchObject({ reason: 'UNAUTHORIZED' })
  })

  it('204 returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res({ ok: true, status: 204 })))
    expect(await spotifyFetch('AT', '/me/player/pause', { method: 'PUT' })).toBeNull()
  })
})

describe('wrappers', () => {
  it('searchTracks maps items to flat track shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res({ json: { tracks: { items: [
      { id: 't1', name: 'Song', uri: 'spotify:track:t1', duration_ms: 1000,
        artists: [{ name: 'A' }, { name: 'B' }], album: { images: [{ url: 'IMG' }] } },
    ] } } }))
    vi.stubGlobal('fetch', fetchMock)
    const out = await searchTracks('AT', 'hello')
    expect(out).toEqual([{ id: 't1', name: 'Song', artists: 'A, B', albumArt: 'IMG', uri: 'spotify:track:t1', durationMs: 1000 }])
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('/search?')
    expect(url).toContain('type=track')
    expect(url).toContain('q=hello')
  })

  it('play sends uris in body via PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res({ ok: true, status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await play('AT', { uris: ['spotify:track:t1'] })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/me/player/play')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ uris: ['spotify:track:t1'] })
  })

  it('pause is a PUT to /me/player/pause', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res({ ok: true, status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await pause('AT')
    expect(fetchMock.mock.calls[0][0]).toContain('/me/player/pause')
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/spotifyApi.test.js`
Expected: FAIL — cannot resolve `./spotifyApi`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/services/spotifyApi.js
// Thin Spotify Web API wrappers. Every call takes a fresh access token; the
// caller (useSpotifyToken.withFreshToken) handles refresh-on-401. See adr/0010.
import { SPOTIFY_API_BASE } from '../constants/spotify'

export class SpotifyError extends Error {
  constructor(status, reason, message) {
    super(message ?? `spotify ${status} ${reason}`)
    this.name = 'SpotifyError'
    this.status = status
    this.reason = reason
  }
}

function classify(status, bodyText) {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'PREMIUM_REQUIRED'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 404) {
    try {
      const reason = JSON.parse(bodyText)?.error?.reason
      if (reason === 'NO_ACTIVE_DEVICE') return 'NO_ACTIVE_DEVICE'
    } catch { /* fallthrough */ }
    return 'NOT_FOUND'
  }
  return 'UNKNOWN'
}

export async function spotifyFetch(accessToken, endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new SpotifyError(res.status, classify(res.status, await res.text()))
  if (res.status === 204) return null
  return res.json()
}

function mapTrack(t) {
  return {
    id: t.id,
    name: t.name,
    artists: (t.artists ?? []).map((a) => a.name).join(', '),
    albumArt: t.album?.images?.[0]?.url ?? null,
    uri: t.uri,
    durationMs: t.duration_ms,
  }
}

export async function searchTracks(accessToken, q) {
  const params = new URLSearchParams({ q, type: 'track', limit: '20' })
  const data = await spotifyFetch(accessToken, `/search?${params.toString()}`)
  return (data?.tracks?.items ?? []).map(mapTrack)
}

export async function getMyPlaylists(accessToken) {
  const data = await spotifyFetch(accessToken, '/me/playlists?limit=50')
  return (data?.items ?? []).map((p) => ({ id: p.id, name: p.name, imageUrl: p.images?.[0]?.url ?? null, uri: p.uri }))
}

export async function getPlaylistTracks(accessToken, playlistId) {
  const data = await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks?limit=100`)
  return (data?.items ?? []).map((i) => i.track).filter(Boolean).map(mapTrack)
}

export async function getDevices(accessToken) {
  const data = await spotifyFetch(accessToken, '/me/player/devices')
  return (data?.devices ?? []).map((d) => ({ id: d.id, name: d.name, isActive: d.is_active }))
}

export async function getPlaybackState(accessToken) {
  const data = await spotifyFetch(accessToken, '/me/player')
  if (!data || !data.item) return null
  return {
    isPlaying: data.is_playing,
    track: mapTrack(data.item),
    progressMs: data.progress_ms ?? 0,
    device: data.device ? { id: data.device.id, name: data.device.name, isActive: data.device.is_active } : null,
    volumePercent: data.device?.volume_percent ?? 100,
  }
}

export function transferPlayback(accessToken, deviceId) {
  return spotifyFetch(accessToken, '/me/player', { method: 'PUT', body: { device_ids: [deviceId], play: true } })
}

export function play(accessToken, { uris, contextUri, deviceId } = {}) {
  const query = deviceId ? `?device_id=${deviceId}` : ''
  const body = uris ? { uris } : contextUri ? { context_uri: contextUri } : undefined
  return spotifyFetch(accessToken, `/me/player/play${query}`, { method: 'PUT', body })
}

export const pause = (accessToken) => spotifyFetch(accessToken, '/me/player/pause', { method: 'PUT' })
export const next = (accessToken) => spotifyFetch(accessToken, '/me/player/next', { method: 'POST' })
export const previous = (accessToken) => spotifyFetch(accessToken, '/me/player/previous', { method: 'POST' })
export const seek = (accessToken, positionMs) =>
  spotifyFetch(accessToken, `/me/player/seek?position_ms=${Math.round(positionMs)}`, { method: 'PUT' })
export const setVolume = (accessToken, percent) =>
  spotifyFetch(accessToken, `/me/player/volume?volume_percent=${Math.round(percent)}`, { method: 'PUT' })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/spotifyApi.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/spotifyApi.js src/services/spotifyApi.test.js
git commit -m "feat(music): Spotify Web API wrapper + error classification"
```

---

### Task 4: Firestore seam (db.js) + security rule

**Files:**
- Modify: `src/lib/db.js` (add ref + shape)
- Modify: `firestore.rules` (add private subcollection rule under `match /users/{uid}`)
- Test: `test/rules/spotify.rules.test.js`

**Interfaces:**
- Produces: `refs.spotifyAuth(uid)` → DocumentRef at `users/{uid}/private/spotify`; `shapes.spotifyConnection({ refreshToken, spotifyUserId })` → `{ refreshToken, spotifyUserId, connectedAt }`.

- [ ] **Step 1: Add the ref + shape**

In `src/lib/db.js`, add to `refs` (after the `map` line):

```js
  spotifyAuth: (uid)            => doc(db, 'users', uid, 'private', 'spotify'),
```

Add to `shapes` (after `newRoadmapSheet`):

```js
  // Private Spotify connection — refresh token lives in users/{uid}/private/*
  // (owner-only), NEVER the world-readable user doc. See docs/adr/0010.
  spotifyConnection: ({ refreshToken, spotifyUserId }) => ({
    refreshToken,
    spotifyUserId: spotifyUserId ?? null,
    connectedAt: serverTimestamp(),
  }),
```

- [ ] **Step 2: Add the security rule**

In `firestore.rules`, inside `match /users/{uid} { ... }`, next to the existing `match /matches/{targetUid}` block, add:

```
      // Private per-user documents (e.g. Spotify refresh token) — owner only.
      // Must NOT live at the top level: user docs are get/list-readable by any
      // signed-in user, which would leak the token. See docs/adr/0010.
      match /private/{docId} {
        allow read, write: if isSignedIn() && request.auth.uid == uid;
      }
```

- [ ] **Step 3: Write the failing rules test**

```js
// test/rules/spotify.rules.test.js
import { describe, it, beforeAll, afterAll } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'

let testEnv
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rcdtd',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
// NOTE: this project's @firebase/rules-unit-testing exposes cleanup(), not destroy().
afterAll(() => testEnv.cleanup())

describe('users/{uid}/private/spotify', () => {
  it('owner can write and read their token', async () => {
    const alice = testEnv.authenticatedContext('alice').firestore()
    const ref = doc(alice, 'users/alice/private/spotify')
    await assertSucceeds(setDoc(ref, { refreshToken: 'RT' }))
    await assertSucceeds(getDoc(ref))
  })

  it('another signed-in user cannot read it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice/private/spotify'), { refreshToken: 'RT' })
    })
    const mallory = testEnv.authenticatedContext('mallory').firestore()
    await assertFails(getDoc(doc(mallory, 'users/alice/private/spotify')))
  })
})
```

- [ ] **Step 4: Run rules test to verify it passes**

Run: `npm run test:rules -- spotify.rules.test.js`
Expected: PASS (2 tests). (If the emulator is required locally, use `npm run test:rules:emu`.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.js firestore.rules test/rules/spotify.rules.test.js
git commit -m "feat(music): private Spotify token seam + owner-only rule"
```

---

### Task 5: useMusicStore

**Files:**
- Create: `src/stores/useMusicStore.js`
- Test: `src/stores/useMusicStore.test.js`

**Interfaces:**
- Produces a Zustand store with state `{ status, accessToken, expiresAt, spotifyUserId, isPlaying, currentTrack, progressMs, device, devices, volumePercent, sheetOpen, searchQuery, searchResults, playlists, activePlaylistTracks, lastError }` and setters:
  - `setConnecting()`, `setTokens({ accessToken, expiresAt, spotifyUserId })` (sets `status='connected'`), `disconnect()` (resets to disconnected)
  - `applyPlayback(state|null)` (from `getPlaybackState`), `setPlaying(bool)` (optimistic), `setDevices(list)`
  - `setVolumePercent(n)`, `openSheet()`, `closeSheet()`, `setSearchQuery(q)`, `setSearchResults(list)`, `setPlaylists(list)`, `setActivePlaylistTracks(list)`, `setError(reason|null)`
- Persists ONLY `{ volumePercent }` under name `rc-music-store`.

- [ ] **Step 1: Write the failing test**

```js
// src/stores/useMusicStore.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { useMusicStore } from './useMusicStore'

const reset = () => useMusicStore.getState().disconnect()

describe('useMusicStore', () => {
  beforeEach(reset)

  it('starts disconnected', () => {
    expect(useMusicStore.getState().status).toBe('disconnected')
    expect(useMusicStore.getState().accessToken).toBeNull()
  })

  it('setTokens marks connected', () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: 123, spotifyUserId: 'u1' })
    const s = useMusicStore.getState()
    expect(s.status).toBe('connected')
    expect(s.accessToken).toBe('AT')
    expect(s.spotifyUserId).toBe('u1')
  })

  it('applyPlayback copies isPlaying/track/device, null clears track', () => {
    useMusicStore.getState().applyPlayback({ isPlaying: true, track: { id: 't' }, progressMs: 10, device: { id: 'd' }, volumePercent: 55 })
    expect(useMusicStore.getState().isPlaying).toBe(true)
    expect(useMusicStore.getState().currentTrack).toEqual({ id: 't' })
    expect(useMusicStore.getState().volumePercent).toBe(55)
    useMusicStore.getState().applyPlayback(null)
    expect(useMusicStore.getState().currentTrack).toBeNull()
    expect(useMusicStore.getState().isPlaying).toBe(false)
  })

  it('setPlaying flips optimistically', () => {
    useMusicStore.getState().setPlaying(true)
    expect(useMusicStore.getState().isPlaying).toBe(true)
  })

  it('disconnect wipes tokens but keeps volume', () => {
    useMusicStore.getState().setVolumePercent(42)
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: 1, spotifyUserId: 'u' })
    useMusicStore.getState().disconnect()
    expect(useMusicStore.getState().accessToken).toBeNull()
    expect(useMusicStore.getState().status).toBe('disconnected')
    expect(useMusicStore.getState().volumePercent).toBe(42)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/stores/useMusicStore.test.js`
Expected: FAIL — cannot resolve `./useMusicStore`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/stores/useMusicStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const disconnectedSlice = {
  status: 'disconnected',
  accessToken: null,
  expiresAt: null,
  spotifyUserId: null,
  isPlaying: false,
  currentTrack: null,
  progressMs: 0,
  device: null,
  devices: [],
  sheetOpen: false,
  searchQuery: '',
  searchResults: [],
  playlists: [],
  activePlaylistTracks: [],
  lastError: null,
}

export const useMusicStore = create(
  persist(
    (set) => ({
      ...disconnectedSlice,
      volumePercent: 100,

      setConnecting: () => set({ status: 'connecting' }),
      setTokens: ({ accessToken, expiresAt, spotifyUserId }) =>
        set((s) => ({ status: 'connected', accessToken, expiresAt, spotifyUserId: spotifyUserId ?? s.spotifyUserId })),
      disconnect: () => set({ ...disconnectedSlice }),

      applyPlayback: (p) =>
        set(p
          ? { isPlaying: p.isPlaying, currentTrack: p.track, progressMs: p.progressMs, device: p.device, volumePercent: p.volumePercent }
          : { isPlaying: false, currentTrack: null, progressMs: 0 }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setDevices: (devices) => set({ devices }),
      setVolumePercent: (volumePercent) => set({ volumePercent }),

      openSheet: () => set({ sheetOpen: true }),
      closeSheet: () => set({ sheetOpen: false }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchResults: (searchResults) => set({ searchResults }),
      setPlaylists: (playlists) => set({ playlists }),
      setActivePlaylistTracks: (activePlaylistTracks) => set({ activePlaylistTracks }),
      setError: (lastError) => set({ lastError }),
    }),
    { name: 'rc-music-store', partialize: (s) => ({ volumePercent: s.volumePercent }) },
  ),
)
```

Note: `disconnect()` resets via `disconnectedSlice`, which does not include `volumePercent`, so the persisted volume is preserved — matching the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/stores/useMusicStore.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/useMusicStore.js src/stores/useMusicStore.test.js
git commit -m "feat(music): useMusicStore connection + player state"
```

---

### Task 6: Token hook (withFreshToken) + refresh-on-401

**Files:**
- Create: `src/hooks/useSpotifyToken.js`
- Test: `src/hooks/useSpotifyToken.test.js`

**Interfaces:**
- Consumes: `useMusicStore` (`accessToken`, `expiresAt`, `setTokens`, `disconnect`), `refreshAccessToken` from `spotifyAuth`, `refs.spotifyAuth` from `db`, `SpotifyError`.
- Produces: `ensureFreshToken()` → `Promise<string>` (returns a valid access token, refreshing if <60s to expiry); `withFreshToken(fn)` → runs `fn(accessToken)`, and on a `SpotifyError` with `reason==='UNAUTHORIZED'` refreshes once and retries. Exposed as a plain module (not a React hook) so services and components can both call it. Reads the current uid from `useAuthStore`.

> Implementation note for the engineer: keep this as pure module functions operating on store getState()/getDoc — it is simpler to test than a React hook and there is no per-render state. Name the file `useSpotifyToken.js` for discoverability but export functions, not a hook.

- [ ] **Step 1: Write the failing test**

```js
// src/hooks/useSpotifyToken.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/spotifyAuth', () => ({ refreshAccessToken: vi.fn() }))
vi.mock('../lib/db', () => ({ refs: { spotifyAuth: (uid) => ({ uid }) } }))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), setDoc: vi.fn(), serverTimestamp: () => 'ts' }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: { uid: 'alice' } }) } }))

import { ensureFreshToken, withFreshToken } from './useSpotifyToken'
import { useMusicStore } from '../stores/useMusicStore'
import { refreshAccessToken } from '../lib/spotifyAuth'
import { getDoc } from 'firebase/firestore'
import { SpotifyError } from '../services/spotifyApi'

const NOW = 1_000_000
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  useMusicStore.getState().disconnect()
  refreshAccessToken.mockReset()
  getDoc.mockReset()
})

describe('ensureFreshToken', () => {
  it('returns current token when not near expiry', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: NOW + 5 * 60_000, spotifyUserId: 'u' })
    expect(await ensureFreshToken()).toBe('AT')
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('refreshes when within 60s of expiry using the stored refresh token', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'OLD', expiresAt: NOW + 10_000, spotifyUserId: 'u' })
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ refreshToken: 'RT' }) })
    refreshAccessToken.mockResolvedValue({ accessToken: 'NEW', refreshToken: 'RT', expiresIn: 3600 })
    expect(await ensureFreshToken()).toBe('NEW')
    expect(refreshAccessToken).toHaveBeenCalledWith('RT')
    expect(useMusicStore.getState().accessToken).toBe('NEW')
  })
})

describe('withFreshToken', () => {
  it('refreshes once and retries on UNAUTHORIZED', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: NOW + 5 * 60_000, spotifyUserId: 'u' })
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ refreshToken: 'RT' }) })
    refreshAccessToken.mockResolvedValue({ accessToken: 'NEW', refreshToken: 'RT', expiresIn: 3600 })
    const fn = vi.fn()
      .mockRejectedValueOnce(new SpotifyError(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce('ok')
    expect(await withFreshToken(fn)).toBe('ok')
    expect(fn).toHaveBeenNthCalledWith(1, 'AT')
    expect(fn).toHaveBeenNthCalledWith(2, 'NEW')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useSpotifyToken.test.js`
Expected: FAIL — cannot resolve `./useSpotifyToken`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/hooks/useSpotifyToken.js
// Ensures a non-expired Spotify access token, refreshing via the Firestore
// refresh token when needed, and retrying a call once after a 401. Plain module
// functions (not a React hook) so services + components share one code path.
import { getDoc } from 'firebase/firestore'
import { refs } from '../lib/db'
import { refreshAccessToken } from '../lib/spotifyAuth'
import { useMusicStore } from '../stores/useMusicStore'
import { useAuthStore } from '../stores/useAuthStore'

const SKEW_MS = 60_000

async function loadRefreshToken() {
  const uid = useAuthStore.getState().user?.uid
  if (!uid) throw new Error('not signed in')
  const snap = await getDoc(refs.spotifyAuth(uid))
  if (!snap.exists()) throw new Error('no spotify connection')
  return snap.data().refreshToken
}

async function doRefresh() {
  const rt = await loadRefreshToken()
  const { accessToken, expiresIn } = await refreshAccessToken(rt)
  const expiresAt = Date.now() + expiresIn * 1000
  useMusicStore.getState().setTokens({ accessToken, expiresAt })
  return accessToken
}

export async function ensureFreshToken() {
  const { accessToken, expiresAt } = useMusicStore.getState()
  if (accessToken && expiresAt && expiresAt - Date.now() > SKEW_MS) return accessToken
  return doRefresh()
}

export async function withFreshToken(fn) {
  const token = await ensureFreshToken()
  try {
    return await fn(token)
  } catch (e) {
    if (e?.reason === 'UNAUTHORIZED') {
      const fresh = await doRefresh()
      return fn(fresh)
    }
    throw e
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useSpotifyToken.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSpotifyToken.js src/hooks/useSpotifyToken.test.js
git commit -m "feat(music): token freshness + refresh-on-401 helper"
```

---

### Task 7: Connect action + session hydration

**Files:**
- Create: `src/services/spotifyConnect.js`
- Modify: `src/services/sessionBootstrap.js` (add `hydrate spotify` step)
- Test: `src/services/spotifyConnect.test.js`

**Interfaces:**
- Consumes: `spotifyAuth` (`generateCodeVerifier/Challenge`, `buildAuthUrl`, `exchangeCodeForTokens`), `db` (`refs.spotifyAuth`, `shapes.spotifyConnection`), `useMusicStore`, `useAuthStore`, `refreshAccessToken`.
- Produces:
  - `startConnect()` → sets verifier+state in `sessionStorage`, `useMusicStore.setConnecting()`, then `location.assign(buildAuthUrl(...))`.
  - `completeConnect({ code, state })` → validates state, exchanges code, writes `shapes.spotifyConnection` to `refs.spotifyAuth(uid)`, fetches `spotifyUserId` via `/me` (optional), `setTokens`. Returns `void`.
  - `hydrateSpotify(uid)` → if `refs.spotifyAuth(uid)` exists, `refreshAccessToken` → `setTokens`. No-op if absent.
  - `disconnectSpotify()` → `deleteDoc(refs.spotifyAuth(uid))` + `useMusicStore.disconnect()`.

- [ ] **Step 1: Write the failing test**

```js
// src/services/spotifyConnect.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/spotifyAuth', () => ({
  generateCodeVerifier: () => 'VER',
  generateCodeChallenge: vi.fn().mockResolvedValue('CHAL'),
  buildAuthUrl: vi.fn(() => 'https://auth/url'),
  exchangeCodeForTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
}))
vi.mock('../lib/db', () => ({
  refs: { spotifyAuth: (uid) => ({ path: `users/${uid}/private/spotify` }) },
  shapes: { spotifyConnection: (x) => ({ ...x, connectedAt: 'ts' }) },
}))
vi.mock('firebase/firestore', () => ({ getDoc: vi.fn(), setDoc: vi.fn(), deleteDoc: vi.fn() }))
vi.mock('../stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: { uid: 'alice' } }) } }))

import { startConnect, completeConnect, hydrateSpotify } from './spotifyConnect'
import { useMusicStore } from '../stores/useMusicStore'
import { exchangeCodeForTokens, refreshAccessToken } from '../lib/spotifyAuth'
import { getDoc, setDoc } from 'firebase/firestore'

beforeEach(() => {
  useMusicStore.getState().disconnect()
  sessionStorage.clear()
  vi.stubGlobal('location', { assign: vi.fn(), origin: 'https://example.app' })
  vi.spyOn(Date, 'now').mockReturnValue(1000)
})

describe('startConnect', () => {
  it('stores verifier+state and redirects', async () => {
    await startConnect()
    expect(sessionStorage.getItem('rc-spotify-verifier')).toBe('VER')
    expect(sessionStorage.getItem('rc-spotify-state')).toBeTruthy()
    expect(location.assign).toHaveBeenCalledWith('https://auth/url')
    expect(useMusicStore.getState().status).toBe('connecting')
  })
})

describe('completeConnect', () => {
  it('rejects a mismatched state without writing tokens', async () => {
    sessionStorage.setItem('rc-spotify-state', 'GOOD')
    sessionStorage.setItem('rc-spotify-verifier', 'VER')
    await expect(completeConnect({ code: 'C', state: 'BAD' })).rejects.toThrow(/state/i)
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('exchanges, persists refresh token, sets tokens', async () => {
    sessionStorage.setItem('rc-spotify-state', 'GOOD')
    sessionStorage.setItem('rc-spotify-verifier', 'VER')
    exchangeCodeForTokens.mockResolvedValue({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600 })
    await completeConnect({ code: 'C', state: 'GOOD' })
    expect(exchangeCodeForTokens).toHaveBeenCalledWith({ code: 'C', codeVerifier: 'VER' })
    expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ refreshToken: 'RT' }))
    expect(useMusicStore.getState().accessToken).toBe('AT')
    expect(useMusicStore.getState().status).toBe('connected')
  })
})

describe('hydrateSpotify', () => {
  it('does nothing when no connection doc', async () => {
    getDoc.mockResolvedValue({ exists: () => false })
    await hydrateSpotify('alice')
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(useMusicStore.getState().status).toBe('disconnected')
  })

  it('refreshes and connects when a token exists', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ refreshToken: 'RT', spotifyUserId: 'u1' }) })
    refreshAccessToken.mockResolvedValue({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600 })
    await hydrateSpotify('alice')
    expect(useMusicStore.getState().status).toBe('connected')
    expect(useMusicStore.getState().accessToken).toBe('AT')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/spotifyConnect.test.js`
Expected: FAIL — cannot resolve `./spotifyConnect`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/services/spotifyConnect.js
// Orchestrates the connect / restore / disconnect lifecycle around the Firestore
// refresh token. See docs/adr/0010.
import { getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { refs, shapes } from '../lib/db'
import {
  generateCodeVerifier, generateCodeChallenge, buildAuthUrl,
  exchangeCodeForTokens, refreshAccessToken,
} from '../lib/spotifyAuth'
import { useMusicStore } from '../stores/useMusicStore'
import { useAuthStore } from '../stores/useAuthStore'

const VERIFIER_KEY = 'rc-spotify-verifier'
const STATE_KEY = 'rc-spotify-state'

function randomState() {
  return generateCodeVerifier().slice(0, 24)
}

export async function startConnect() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = randomState()
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  useMusicStore.getState().setConnecting()
  location.assign(buildAuthUrl({ state, codeChallenge: challenge }))
}

export async function completeConnect({ code, state }) {
  const expectedState = sessionStorage.getItem(STATE_KEY)
  const codeVerifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!expectedState || state !== expectedState) throw new Error('spotify state mismatch')
  const uid = useAuthStore.getState().user?.uid
  if (!uid) throw new Error('not signed in')

  const { accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens({ code, codeVerifier })
  await setDoc(refs.spotifyAuth(uid), shapes.spotifyConnection({ refreshToken, spotifyUserId: null }))
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  useMusicStore.getState().setTokens({ accessToken, expiresAt: Date.now() + expiresIn * 1000, spotifyUserId: null })
}

export async function hydrateSpotify(uid) {
  const snap = await getDoc(refs.spotifyAuth(uid))
  if (!snap.exists()) return
  const { refreshToken, spotifyUserId } = snap.data()
  const { accessToken, expiresIn } = await refreshAccessToken(refreshToken)
  useMusicStore.getState().setTokens({ accessToken, expiresAt: Date.now() + expiresIn * 1000, spotifyUserId })
}

export async function disconnectSpotify() {
  const uid = useAuthStore.getState().user?.uid
  if (uid) await deleteDoc(refs.spotifyAuth(uid))
  useMusicStore.getState().disconnect()
}
```

- [ ] **Step 4: Wire into sessionBootstrap**

In `src/services/sessionBootstrap.js`, add the import near the other service imports:

```js
import { hydrateSpotify } from './spotifyConnect'
```

Add a step inside the Wave 2 `Promise.all([...])` array in `bootstrapSession`:

```js
    step('hydrate spotify', () => hydrateSpotify(uid)),
```

(No teardown entry is required — `disconnect()` is user-initiated; on logout the store is cleared by existing auth teardown. If you want belt-and-suspenders, add `useMusicStore.getState().disconnect()` to `teardownSession()`.)

- [ ] **Step 5: Run tests + lint**

Run: `npm test -- src/services/spotifyConnect.test.js`
Expected: PASS (5 tests).
Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/spotifyConnect.js src/services/spotifyConnect.test.js src/services/sessionBootstrap.js
git commit -m "feat(music): connect/restore/disconnect + session hydration"
```

---

### Task 8: Callback route

**Files:**
- Create: `src/pages/MusicCallback.jsx`
- Modify: `src/App.jsx` (lazy import + route inside `RequireAuth`)
- Test: `src/pages/MusicCallback.test.jsx`

**Interfaces:**
- Consumes: `completeConnect` from `spotifyConnect`, `useNavigate`, `useSearchParams` from react-router.
- Produces: a page that on mount reads `code`/`state`/`error` from the query, calls `completeConnect`, then `navigate('/home', { replace: true })`; on error shows a message + a "กลับหน้าหลัก" link.

- [ ] **Step 1: Write the failing test**

```jsx
// src/pages/MusicCallback.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const navigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => navigate }))
vi.mock('../services/spotifyConnect', () => ({ completeConnect: vi.fn() }))

import MusicCallback from './MusicCallback'
import { completeConnect } from '../services/spotifyConnect'

beforeEach(() => { navigate.mockReset(); completeConnect.mockReset() })

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/music/callback" element={<MusicCallback />} /></Routes>
    </MemoryRouter>,
  )
}

describe('MusicCallback', () => {
  it('completes connect then redirects home', async () => {
    completeConnect.mockResolvedValue()
    renderAt('/music/callback?code=C&state=S')
    await waitFor(() => expect(completeConnect).toHaveBeenCalledWith({ code: 'C', state: 'S' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/home', { replace: true }))
  })

  it('shows an error message when Spotify denies', async () => {
    renderAt('/music/callback?error=access_denied')
    expect(await screen.findByText(/เชื่อม Spotify ไม่สำเร็จ/)).toBeInTheDocument()
    expect(completeConnect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/MusicCallback.test.jsx`
Expected: FAIL — cannot resolve `./MusicCallback`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/pages/MusicCallback.jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { completeConnect } from '../services/spotifyConnect'

export default function MusicCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    // Run exactly once. React StrictMode double-invokes effects in dev; without
    // this guard completeConnect would exchange the single-use authorization
    // code twice → Spotify 400 invalid_grant.
    if (startedRef.current) return
    startedRef.current = true

    const error = params.get('error')
    const code = params.get('code')
    const state = params.get('state')
    if (error || !code || !state) { setFailed(true); return }
    completeConnect({ code, state })
      .then(() => navigate('/home', { replace: true }))
      .catch(() => setFailed(true))
  }, [params, navigate])

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
      {failed ? (
        <>
          <p className="thai-font text-ink">เชื่อม Spotify ไม่สำเร็จ ลองใหม่อีกครั้ง</p>
          <button onClick={() => navigate('/home', { replace: true })} className="pixel-font text-[10px] text-brand">
            กลับหน้าหลัก
          </button>
        </>
      ) : (
        <p className="thai-font text-brand">กำลังเชื่อม Spotify…</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add the route**

In `src/App.jsx`, add the lazy import next to the others:

```js
const MusicCallback = lazy(() => import('./pages/MusicCallback'))
```

Add the route inside the existing `<Route element={<RequireAuth />}>` block (needs a signed-in user to write Firestore):

```jsx
            <Route path="/music/callback" element={<MusicCallback />} />
```

- [ ] **Step 5: Run test + lint**

Run: `npm test -- src/pages/MusicCallback.test.jsx`
Expected: PASS (2 tests).
Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/MusicCallback.jsx src/pages/MusicCallback.test.jsx src/App.jsx
git commit -m "feat(music): OAuth callback route"
```

---

### Task 9: Now-playing poll hook

**Files:**
- Create: `src/hooks/useNowPlayingPoll.js`
- Test: `src/hooks/useNowPlayingPoll.test.js`

**Interfaces:**
- Consumes: `withFreshToken` (Task 6), `getPlaybackState` (Task 3), `useMusicStore` (`status`, `applyPlayback`, `setError`).
- Produces: `useNowPlayingPoll()` — a React hook that, while `status==='connected'` and `document.visibilityState==='visible'`, calls `getPlaybackState` every 5000ms via `withFreshToken` and pushes the result into `applyPlayback`. Cleans up its interval on unmount and stops polling when the tab is hidden (via a `visibilitychange` listener).

- [ ] **Step 1: Write the failing test**

```js
// src/hooks/useNowPlayingPoll.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('./useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../services/spotifyApi', () => ({ getPlaybackState: vi.fn() }))

import { useNowPlayingPoll } from './useNowPlayingPoll'
import { useMusicStore } from '../stores/useMusicStore'
import { getPlaybackState } from '../services/spotifyApi'

beforeEach(() => {
  vi.useFakeTimers()
  useMusicStore.getState().disconnect()
  getPlaybackState.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('useNowPlayingPoll', () => {
  it('does not poll while disconnected', () => {
    renderHook(() => useNowPlayingPoll())
    vi.advanceTimersByTime(6000)
    expect(getPlaybackState).not.toHaveBeenCalled()
  })

  it('polls every 5s when connected and applies playback', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    getPlaybackState.mockResolvedValue({ isPlaying: true, track: { id: 't' }, progressMs: 0, device: null, volumePercent: 80 })
    renderHook(() => useNowPlayingPoll())
    await vi.advanceTimersByTimeAsync(5000)
    expect(getPlaybackState).toHaveBeenCalled()
    await waitFor(() => expect(useMusicStore.getState().currentTrack).toEqual({ id: 't' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useNowPlayingPoll.test.js`
Expected: FAIL — cannot resolve `./useNowPlayingPoll`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/hooks/useNowPlayingPoll.js
import { useEffect } from 'react'
import { withFreshToken } from './useSpotifyToken'
import { getPlaybackState } from '../services/spotifyApi'
import { useMusicStore } from '../stores/useMusicStore'

const POLL_MS = 5000

export function useNowPlayingPoll() {
  const status = useMusicStore((s) => s.status)

  useEffect(() => {
    if (status !== 'connected') return
    let stopped = false

    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const state = await withFreshToken((token) => getPlaybackState(token))
        if (!stopped) useMusicStore.getState().applyPlayback(state)
      } catch (e) {
        if (!stopped) useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN')
      }
    }

    tick()
    const id = setInterval(tick, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)

    return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [status])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useNowPlayingPoll.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNowPlayingPoll.js src/hooks/useNowPlayingPoll.test.js
git commit -m "feat(music): now-playing polling hook"
```

---

### Task 10: PlayerSheet (search, playlists, transport, devices)

**Files:**
- Create: `src/components/music/PlayerSheet.jsx`
- Test: `src/components/music/PlayerSheet.test.jsx`

**Interfaces:**
- Consumes: `Popup` (`src/components/ui/Popup.jsx`, `variant="sheet"`), `useMusicStore`, `withFreshToken`, `spotifyApi` (`searchTracks`, `play`, `pause`, `next`, `previous`, `getDevices`, `transferPlayback`), `startConnect`/`disconnectSpotify`.
- Produces: default-export `PlayerSheet()` rendering:
  - If `status !== 'connected'`: a "เชื่อม Spotify" button calling `startConnect`.
  - If connected: a debounced search input (300ms) → `searchTracks` → list; tapping a track calls `withFreshToken((t) => play(t, { uris: [track.uri] }))` and optimistic `setPlaying(true)`. Transport row (prev/play-pause/next). A device hint shown when `lastError==='NO_ACTIVE_DEVICE'`.
- Only rendered when `sheetOpen` is true (caller in Task 11 guards it).

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/music/PlayerSheet.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../hooks/useSpotifyToken', () => ({ withFreshToken: (fn) => fn('AT') }))
vi.mock('../../services/spotifyApi', () => ({
  searchTracks: vi.fn(), play: vi.fn().mockResolvedValue(), pause: vi.fn(), next: vi.fn(), previous: vi.fn(),
  getDevices: vi.fn().mockResolvedValue([]), transferPlayback: vi.fn(),
}))
vi.mock('../../services/spotifyConnect', () => ({ startConnect: vi.fn(), disconnectSpotify: vi.fn() }))

import PlayerSheet from './PlayerSheet'
import { useMusicStore } from '../../stores/useMusicStore'
import { searchTracks, play } from '../../services/spotifyApi'
import { startConnect } from '../../services/spotifyConnect'

beforeEach(() => {
  useMusicStore.getState().disconnect()
  useMusicStore.getState().openSheet()
  searchTracks.mockReset().mockResolvedValue([])
  play.mockClear()
  startConnect.mockClear()
})

describe('PlayerSheet', () => {
  it('shows connect button when disconnected', () => {
    render(<PlayerSheet />)
    fireEvent.click(screen.getByRole('button', { name: /เชื่อม Spotify/ }))
    expect(startConnect).toHaveBeenCalled()
  })

  it('searches and plays a tapped track', async () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    searchTracks.mockResolvedValue([{ id: 't1', name: 'Song', artists: 'A', albumArt: null, uri: 'spotify:track:t1', durationMs: 1000 }])
    render(<PlayerSheet />)
    fireEvent.change(screen.getByPlaceholderText(/ค้นหาเพลง/), { target: { value: 'hello' } })
    const item = await screen.findByText('Song')
    fireEvent.click(item)
    await waitFor(() => expect(play).toHaveBeenCalledWith('AT', { uris: ['spotify:track:t1'] }))
    expect(useMusicStore.getState().isPlaying).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/music/PlayerSheet.test.jsx`
Expected: FAIL — cannot resolve `./PlayerSheet`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/music/PlayerSheet.jsx
import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import Popup from '../ui/Popup'
import { useMusicStore } from '../../stores/useMusicStore'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { searchTracks, play, pause, next, previous } from '../../services/spotifyApi'
import { startConnect } from '../../services/spotifyConnect'

export default function PlayerSheet() {
  const status = useMusicStore((s) => s.status)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const results = useMusicStore((s) => s.searchResults)
  const lastError = useMusicStore((s) => s.lastError)
  const closeSheet = useMusicStore((s) => s.closeSheet)
  const [query, setQuery] = useState('')
  const debounceRef = useRef()

  useEffect(() => {
    if (status !== 'connected') return
    if (!query.trim()) { useMusicStore.getState().setSearchResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const tracks = await withFreshToken((t) => searchTracks(t, query.trim()))
        useMusicStore.getState().setSearchResults(tracks)
      } catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, status])

  const onPlayTrack = async (track) => {
    useMusicStore.getState().setPlaying(true)
    try { await withFreshToken((t) => play(t, { uris: [track.uri] })) }
    catch (e) { useMusicStore.getState().setPlaying(false); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const control = (fn) => async () => {
    try { await withFreshToken((t) => fn(t)) }
    catch (e) { useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  const togglePlay = async () => {
    const wantPlay = !isPlaying
    useMusicStore.getState().setPlaying(wantPlay)
    try { await withFreshToken((t) => (wantPlay ? play(t) : pause(t))) }
    catch (e) { useMusicStore.getState().setPlaying(!wantPlay); useMusicStore.getState().setError(e?.reason ?? 'UNKNOWN') }
  }

  return (
    <Popup variant="sheet" size="md" onClose={closeSheet}>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        {status !== 'connected' ? (
          <button
            onClick={() => startConnect()}
            className="pixel-font text-[10px] text-white bg-brand rounded-2xl py-3"
          >
            เชื่อม Spotify
          </button>
        ) : (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาเพลง…"
              className="w-full rounded-2xl border border-brand-soft px-4 py-2 thai-font"
            />
            {lastError === 'NO_ACTIVE_DEVICE' && (
              <p className="thai-font text-xs text-accent-pink">เปิดแอป Spotify ในเครื่องใดเครื่องหนึ่งก่อน แล้วลองใหม่</p>
            )}
            {lastError === 'PREMIUM_REQUIRED' && (
              <p className="thai-font text-xs text-accent-pink">ต้องใช้ Spotify Premium เพื่อควบคุมการเล่น</p>
            )}
            <ul className="flex flex-col divide-y divide-brand-soft">
              {results.map((t) => (
                <li key={t.id}>
                  <button onClick={() => onPlayTrack(t)} className="w-full text-left py-2 flex items-center gap-3">
                    {t.albumArt && <img src={t.albumArt} alt="" className="w-10 h-10 rounded" />}
                    <span className="flex flex-col">
                      <span className="thai-font text-sm text-ink">{t.name}</span>
                      <span className="thai-font text-xs text-gray-400">{t.artists}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-center gap-6 pt-2">
              <button onClick={control(previous)} aria-label="Previous"><SkipBack /></button>
              <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause /> : <Play />}</button>
              <button onClick={control(next)} aria-label="Next"><SkipForward /></button>
            </div>
          </>
        )}
      </div>
    </Popup>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/music/PlayerSheet.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/music/PlayerSheet.jsx src/components/music/PlayerSheet.test.jsx
git commit -m "feat(music): PlayerSheet with search + transport"
```

---

### Task 11: MiniPlayer + mount in MobileLayout

**Files:**
- Create: `src/components/music/MiniPlayer.jsx`
- Modify: `src/App.jsx` (render `<MiniPlayer/>` inside `MobileLayout`)
- Test: `src/components/music/MiniPlayer.test.jsx`

**Interfaces:**
- Consumes: `useMusicStore`, `useNowPlayingPoll` (Task 9), `PlayerSheet` (Task 10).
- Produces: default-export `MiniPlayer()` — calls `useNowPlayingPoll()`; renders a fixed bar above the BottomNavBar zone. Disconnected → a compact "🎵 เชื่อม Spotify" pill that opens the sheet. Connected → album art + track name + play/pause; tapping the bar body opens the sheet. Renders `<PlayerSheet/>` when `sheetOpen`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/music/MiniPlayer.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../../hooks/useNowPlayingPoll', () => ({ useNowPlayingPoll: () => {} }))
vi.mock('./PlayerSheet', () => ({ default: () => <div data-testid="player-sheet" /> }))

import MiniPlayer from './MiniPlayer'
import { useMusicStore } from '../../stores/useMusicStore'

beforeEach(() => useMusicStore.getState().disconnect())

describe('MiniPlayer', () => {
  it('opens the sheet from the connect pill when disconnected', () => {
    render(<MiniPlayer />)
    fireEvent.click(screen.getByRole('button', { name: /เชื่อม Spotify/ }))
    expect(useMusicStore.getState().sheetOpen).toBe(true)
    expect(screen.getByTestId('player-sheet')).toBeInTheDocument()
  })

  it('shows the current track name when connected + playing', () => {
    useMusicStore.getState().setTokens({ accessToken: 'AT', expiresAt: Date.now() + 1e6, spotifyUserId: 'u' })
    useMusicStore.getState().applyPlayback({ isPlaying: true, track: { id: 't', name: 'My Song', artists: 'A', albumArt: null }, progressMs: 0, device: null, volumePercent: 100 })
    render(<MiniPlayer />)
    expect(screen.getByText('My Song')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/music/MiniPlayer.test.jsx`
Expected: FAIL — cannot resolve `./MiniPlayer`.

- [ ] **Step 3: Write minimal implementation**

```jsx
// src/components/music/MiniPlayer.jsx
import { Play, Pause, Music } from 'lucide-react'
import { useMusicStore } from '../../stores/useMusicStore'
import { useNowPlayingPoll } from '../../hooks/useNowPlayingPoll'
import { withFreshToken } from '../../hooks/useSpotifyToken'
import { play, pause } from '../../services/spotifyApi'
import { Z_NAV } from '../../constants/zIndex'
import PlayerSheet from './PlayerSheet'

export default function MiniPlayer() {
  useNowPlayingPoll()
  const status = useMusicStore((s) => s.status)
  const track = useMusicStore((s) => s.currentTrack)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const sheetOpen = useMusicStore((s) => s.sheetOpen)
  const openSheet = useMusicStore((s) => s.openSheet)

  const togglePlay = async (e) => {
    e.stopPropagation()
    const wantPlay = !isPlaying
    useMusicStore.getState().setPlaying(wantPlay)
    try { await withFreshToken((t) => (wantPlay ? play(t) : pause(t))) }
    catch (err) { useMusicStore.getState().setPlaying(!wantPlay); useMusicStore.getState().setError(err?.reason ?? 'UNKNOWN') }
  }

  return (
    <>
      {/* Docked just above the floating BottomNavBar (bottom-4 h~64). */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[92%] max-w-md"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)', zIndex: Z_NAV }}
      >
        {status !== 'connected' ? (
          <button
            onClick={openSheet}
            className="w-full bg-white/95 rounded-2xl shadow-md px-4 py-2 flex items-center gap-2 pixel-font text-[9px] text-brand"
          >
            <Music size={16} /> เชื่อม Spotify
          </button>
        ) : (
          <div
            onClick={openSheet}
            role="button"
            className="w-full bg-white rounded-2xl shadow-md px-3 py-2 flex items-center gap-3"
          >
            {track?.albumArt
              ? <img src={track.albumArt} alt="" className="w-9 h-9 rounded" />
              : <div className="w-9 h-9 rounded bg-brand-soft flex items-center justify-center"><Music size={16} className="text-brand" /></div>}
            <span className="flex-1 min-w-0">
              <span className="block truncate thai-font text-sm text-ink">{track?.name ?? 'พร้อมเล่น'}</span>
              <span className="block truncate thai-font text-xs text-gray-400">{track?.artists ?? ''}</span>
            </span>
            <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="text-brand">
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>
          </div>
        )}
      </div>
      {sheetOpen && <PlayerSheet />}
    </>
  )
}
```

- [ ] **Step 4: Mount in MobileLayout**

In `src/App.jsx`, add the import:

```js
const MiniPlayer = lazy(() => import('./components/music/MiniPlayer'))
```

In `MobileLayout`, render it for signed-in users inside the layout `<div>` (after `<main>`), so it persists across `/home` and `/roadmap`:

```jsx
      {user && (
        <Suspense fallback={null}>
          <MiniPlayer />
        </Suspense>
      )}
      {user && <OnboardingModal />}
```

- [ ] **Step 5: Run test + lint + full suite**

Run: `npm test -- src/components/music/MiniPlayer.test.jsx`
Expected: PASS (2 tests).
Run: `npm test`
Expected: whole suite green.
Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/music/MiniPlayer.jsx src/components/music/MiniPlayer.test.jsx src/App.jsx
git commit -m "feat(music): persistent MiniPlayer mounted in MobileLayout"
```

---

### Task 12: Manual verification + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-07-05-spotify-music-integration-design.md` (append a "Verified" note)

- [ ] **Step 1: Configure Spotify app**

In the Spotify Developer Dashboard, create an app, copy the Client ID into `.env` as `VITE_SPOTIFY_CLIENT_ID`, and add redirect URIs `http://127.0.0.1:5173/music/callback` and your prod origin `/music/callback` (Spotify rejects `http://localhost` as "not secure"; the "Web API" checkbox may be greyed out — that is fine, Web API works by default). Restart the dev server, and open the app at `http://127.0.0.1:5173`.

- [ ] **Step 2: Drive the flow (Premium account + a device)**

Run `npm run dev`. With the Spotify app open on your phone/desktop:
1. Sign in to the app → the MiniPlayer shows "เชื่อม Spotify".
2. Tap it → PlayerSheet → "เชื่อม Spotify" → Spotify consent → returns to `/home`, MiniPlayer now shows player.
3. Search a song → tap it → audio plays on your Spotify device; MiniPlayer reflects it within ~5s.
4. Play/pause/next from the mini-bar; reload the page → still connected (Firestore restore).
5. Close all Spotify devices, hit play → "เปิดแอป Spotify…" hint appears (`NO_ACTIVE_DEVICE`).

- [ ] **Step 3: Deploy rules**

Run: `firebase deploy --only firestore:rules`
Expected: rules deploy clean (the new `users/{uid}/private/{docId}` block).

- [ ] **Step 4: Commit the verification note**

```bash
git add docs/superpowers/specs/2026-07-05-spotify-music-integration-design.md
git commit -m "docs(music): mark Spotify integration verified"
```

---

## Self-Review

- **Spec coverage:** auth/PKCE (T2), API + errors (T3), token storage + rule (T4), store (T5), refresh-on-401 (T6), connect/restore/disconnect + bootstrap (T7), callback route (T8), polling (T9), PlayerSheet search/transport (T10), MiniPlayer + mount (T11), config + manual verify (T1/T12). Non-goals excluded by omission. All spec sections map to a task.
- **Type consistency:** `track` shape `{ id, name, artists, albumArt, uri, durationMs }` is produced by `mapTrack` (T3) and consumed identically in T10/T11. `setTokens({ accessToken, expiresAt, spotifyUserId })` signature consistent across T5/T6/T7. `withFreshToken(fn)` passes the token as `fn`'s first arg everywhere. `SpotifyError.reason` strings match between T3 producers and T6/T9/T10 consumers.
- **Placeholder scan:** no TBD/TODO; every code step is complete.
