# Spotify Music Integration — Design Spec

**Date:** 2026-07-05
**Status:** approved (design), pending implementation
**Related:** ADR-0010

## Goal

Let a signed-in user connect their Spotify account and use the app as a **remote control** — search any track, browse their own playlists, and control playback (play/pause/next/prev/volume) — while the audio plays on the user's own Spotify device (phone Spotify app, desktop app, etc.).

## Why "remote control" and not in-app playback

The app is **mobile-first web**. Spotify's in-browser full-track player (Web Playback SDK) is **Premium-only** *and* **desktop-browser only** — it silently fails in mobile Safari/Chrome. Spotify **Connect** sidesteps this: the app issues Web API commands and audio comes out of whatever Spotify device the user already has. This requires **Premium** and an **active Spotify device**.

## Core decisions (from brainstorming)

| Dimension | Decision |
|---|---|
| Purpose | Connect Spotify, then play/control any song — private utility |
| Playback | Spotify **Connect remote** (Web API control; no in-app audio) |
| Scope | Search tracks · play/pause/next/prev/volume · browse own playlists · now-playing |
| Auth | **Authorization Code + PKCE** (no client secret; all client-side) |
| UI | Persistent **mini-bar** (in `MobileLayout`) → expands to **PlayerSheet** (`Popup variant="sheet"`) |
| Token storage | Refresh token in Firestore **private subcollection** `users/{uid}/private/spotify` (follows user across devices, owner-only) |

## Non-goals (v1)

- No music-taste on Profile; no effect on match score.
- No Coins / streak / reward tie-in.
- No shared / group / party listening — solo only.
- No in-game (Phaser) / Personal Map music.

Each is a valid v2 follow-up with its own spec.

## Architecture (Approach A — pure client-side PKCE)

Spotify's token endpoint and Web API both allow CORS from a browser SPA, so **no backend proxy is required**. This matches the app's existing client-first pattern (Firebase, Gemini).

### New files

| File | Responsibility |
|---|---|
| `src/constants/spotify.js` | `SPOTIFY_SCOPES`, `SPOTIFY_AUTH_URL`, `SPOTIFY_TOKEN_URL`, `redirectUri()`, `clientId()` |
| `src/lib/spotifyAuth.js` | PKCE: `generateCodeVerifier`, `generateCodeChallenge`, `buildAuthUrl`, `exchangeCodeForTokens`, `refreshAccessToken` |
| `src/services/spotifyApi.js` | `spotifyFetch` + `SpotifyError` + call wrappers (`searchTracks`, `getMyPlaylists`, `getPlaylistTracks`, `getDevices`, `getPlaybackState`, `transferPlayback`, `play`, `pause`, `next`, `previous`, `seek`, `setVolume`) |
| `src/stores/useMusicStore.js` | Connection + player + UI state; setters. Persists only `volumePercent` |
| `src/hooks/useSpotifyToken.js` | `withFreshToken(fn)` — ensures a non-expired access token, refreshes on demand / on 401 |
| `src/hooks/useNowPlayingPoll.js` | Polls `getPlaybackState` every 5s while connected + tab visible |
| `src/components/music/MiniPlayer.jsx` | Persistent bar; disconnected → "Connect Spotify" pill, connected → now-playing + tap to expand |
| `src/components/music/PlayerSheet.jsx` | Full player: search, playlists, transport, device picker |
| `src/pages/MusicCallback.jsx` | `/music/callback` — validate `state`, exchange code, persist token, redirect |

### Touched files

- `src/lib/db.js` — add `refs.spotifyAuth(uid)` + `shapes.spotifyConnection(...)`.
- `firestore.rules` — add `users/{uid}/private/{docId}` owner-only rule.
- `src/services/sessionBootstrap.js` — add isolated `hydrate spotify` step (read refresh token → refresh access token → mark connected).
- `src/App.jsx` — add `/music/callback` route (inside `RequireAuth`); mount `<MiniPlayer/>` in `MobileLayout`.
- `.env.example` / env docs — add `VITE_SPOTIFY_CLIENT_ID`.

## OAuth flow (PKCE)

1. Tap **Connect Spotify** → `buildAuthUrl()` creates `code_verifier` (→ `sessionStorage`), `code_challenge` (SHA-256, base64url), random `state` (→ `sessionStorage`); redirect to Spotify authorize with `SPOTIFY_SCOPES`.
2. Spotify → `/music/callback?code&state`. `MusicCallback` verifies `state`, calls `exchangeCodeForTokens` → `{ accessToken, refreshToken, expiresIn }`.
3. Persist `refreshToken` + `spotifyUserId` to `users/{uid}/private/spotify`; put `accessToken` + `expiresAt` in `useMusicStore`; redirect to `/home`.
4. Later sessions: `sessionBootstrap` reads the refresh token → `refreshAccessToken` → connected, no re-consent.
5. Access token auto-refreshes when within 60s of expiry and on any 401 (`withFreshToken`).

**Scopes:** `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`, `playlist-read-private`, `playlist-read-collaborative`.

## Data flow & now-playing

Spotify Connect gives **no push channel** → poll `getPlaybackState` every ~5s while the mini-bar/sheet is mounted; pause polling on `document.visibilitychange` (hidden). Controls are **optimistic** (flip `isPlaying` immediately, reconcile on next poll). Search is debounced (300ms, `type=track`). Tapping a track → `play({ uris:[uri] })` on the active device; tapping a playlist → `play({ contextUri })`.

## Error handling & edge cases

| Case | Detection | UX |
|---|---|---|
| Not connected | no refresh token | Mini-bar shows "เชื่อม Spotify" CTA |
| Non-Premium | 403 on playback endpoints (`PREMIUM_REQUIRED`) | Toast: "ต้องใช้ Spotify Premium เพื่อควบคุมการเล่น"; search/browse still work |
| No active device | 404 `NO_ACTIVE_DEVICE` | Prompt "เปิดแอป Spotify แล้วลองใหม่"; offer device picker (`getDevices` → `transferPlayback`) |
| Token revoked / refresh fails | refresh returns 400/401 | Mark disconnected, delete `private/spotify` doc, prompt reconnect |
| Rate limited | 429 | Respect `Retry-After`; back off polling |
| Callback `state` mismatch | compare to `sessionStorage` | Abort, show error, no token stored |

## Testing

- **Unit** `spotifyAuth`: verifier length/charset, challenge = base64url(SHA-256(verifier)), `buildAuthUrl` params, token-exchange request body (mock `fetch`, `crypto.subtle`).
- **Unit** `spotifyApi`: `spotifyFetch` maps 403→`PREMIUM_REQUIRED`, 404 body reason→`NO_ACTIVE_DEVICE`, 429→`RATE_LIMITED`; wrappers hit correct endpoint/method/body.
- **Store** `useMusicStore`: optimistic `setPlaying`, connection lifecycle (`setTokens`/`disconnect`), device/search/playlist setters.
- **Rules** `test/rules`: owner can read/write `users/{uid}/private/spotify`; another signed-in user **cannot** read it.
- **Component** (jsdom, mocked api): `MiniPlayer` renders disconnected / connected / no-device states; `PlayerSheet` search→play calls `play` with the track uri.

## Config

- `VITE_SPOTIFY_CLIENT_ID` — public (PKCE, no secret). Register redirect URIs in the Spotify dashboard: `http://127.0.0.1:5173/music/callback` and the prod origin `/music/callback`.
  - **Spotify no longer accepts `http://localhost`** ("redirect URI is not secure") — use the loopback IP `127.0.0.1`. During dev, open the app at `http://127.0.0.1:5173` (not `localhost`) so `location.origin` matches the registered redirect exactly.

## Verified

**2026-07-05** — Implementation complete (Tasks 1–11). All unit/component tests pass (`npm test`, 611 tests). Manual verification with a Spotify Developer app (`VITE_SPOTIFY_CLIENT_ID`), Premium account, and active device is pending operator sign-off (Task 12 checklist).
