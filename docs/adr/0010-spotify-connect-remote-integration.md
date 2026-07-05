---
status: accepted
---

# Spotify music uses Connect remote-control via client-side PKCE, not in-app playback

The Music feature lets a user connect Spotify and control playback from the app. The app is
mobile-first web, where Spotify's Web Playback SDK cannot run (it is Premium-only **and**
desktop-browser only — it silently fails in mobile Safari/Chrome). We therefore make the app a
**Spotify Connect remote**: it issues Web API commands and audio plays on the user's own already-
running Spotify device. This requires the user to have **Premium** and an **active device**.

Authentication uses the **Authorization Code + PKCE** flow with no client secret, so token exchange
and refresh happen entirely client-side — consistent with how the app already talks to Firebase and
Gemini. Spotify's token endpoint and Web API allow CORS from a browser SPA, so **no backend proxy**
is introduced. The public `VITE_SPOTIFY_CLIENT_ID` is the only new config.

The long-lived **refresh token** is stored in Firestore so the connection follows the user across
devices. It is written to a **private subcollection** `users/{uid}/private/spotify`, **not** the
top-level user doc, because `firestore.rules` grants `get, list` on `users/{uid}` to every signed-in
user (for social/match features) — a top-level token field would leak to all authenticated users.
The private subcollection is owner-only (`request.auth.uid == uid`), mirroring the existing
`users/{uid}/matches` rule.

## Considered Options

- **Web Playback SDK (in-app audio)** (rejected) — plays full tracks in-browser, but is desktop-only
  and Premium-only; unusable on the app's primary mobile target.
- **30-second preview clips** (rejected) — works without Premium, but "play any song" degrades to
  30s snippets; not the product intent.
- **Embed iframe player** (rejected) — simplest, but a boxed iframe can't be driven by our own
  mini-bar/transport UI and full playback still needs a Premium login inside the frame.
- **Vercel `/api/spotify/*` proxy holding the token** (rejected for v1) — strictly more secure
  (token never reaches the client), but Spotify is directly CORS-reachable, so a proxy is largely
  ceremony; it also contradicts the "follow across devices via Firestore" storage choice and adds
  serverless infra + latency. Revisit if the client-readable-token tradeoff becomes unacceptable.
- **Refresh token in the top-level user doc** (rejected) — simplest write path, but user docs are
  world-readable to signed-in users; would leak the token. Private subcollection chosen instead.

## Consequences

- Feature works on mobile, but only for Premium users with an active Spotify device; the UI must
  handle `NO_ACTIVE_DEVICE` (404) and `PREMIUM_REQUIRED` (403) gracefully.
- The refresh token is client-readable by its owner (protected by rules). Acceptable for this app's
  threat model; a future `/api` proxy can harden it without changing the UI.
- No in-app audio element; "now playing" is obtained by polling `getPlaybackState` (~5s) since
  Connect provides no push channel.
