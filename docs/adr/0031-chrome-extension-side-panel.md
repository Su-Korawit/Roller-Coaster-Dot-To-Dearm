# 0031 — Chrome extension: side panel + page dock

Status: accepted

## Context
Some tools students need live outside the OS (MyTCAS, university admission sites; many forbid embedding, see `NO_EMBED_IDS`).
Switching tabs breaks the flow. We wanted our UI next to, or on, those pages.

## Decision
A Manifest V3 extension in `extension/`:
1. **Side panel** that navigates to the site (narrow width → the OS already renders its phone layout). Navigating, not an iframe, so Google sign-in and the saved login behave as in a normal tab.
2. **Dock** content script (shadow DOM, bottom of the page) only on `mytcas.com` and `*.ac.th`, with shortcuts that open an app via `?open=<id>` (`src/os/deepLink.js`).

## Considered options
- iframe of the target site inside our window: blocked by X-Frame-Options on most sites.
- Injecting a top bar and pushing the page down: breaks other sites' layouts, and needs broad permissions.
- Iframe of our site in the panel: third-party storage partitioning makes login separate and Google popups unreliable.

## Consequences
- Needs Chrome/Edge 116+. Not published to the Web Store yet (load unpacked, see `extension/README.md`).
- The dock never reads page content; permissions are `sidePanel`, `storage` and the two host patterns.
- Not exercised in a real Chrome in the authoring session; verify before release.
