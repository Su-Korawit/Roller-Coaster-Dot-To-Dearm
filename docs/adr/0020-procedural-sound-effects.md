# 0020 — Procedural sound effects and game-feel feedback

**Status:** accepted
**Date:** 2026-10-14

## Context

The cozy pixel RPG theme (ADR 0019) is visual only. What makes a game feel like one is
immediate feedback: a click blip, a panel opening, XP and level-ups, a nudge when a Focus
check-in is due on a tab left open all day. The repo has no sound-effect assets, and adding
licensed audio files means licensing, hosting and download weight.

## Decision

1. **Generate every effect with WebAudio** (`src/lib/sfx.js`): a few oscillator notes per sound
   (`click open close success coin chime emote error levelup`) plus a looped, band-limited-noise
   **rain** for the night library. Nothing to license, host or load.
2. **One delegated pointer listener** gives every button, link, tab, switch and `.neo-btn` the click
   blip (`installUiSounds` in `App`); disabled controls and `[data-no-sfx]` subtrees are skipped.
   `Popup` plays open/close, so every sheet announces itself.
3. **Feedback is a service, not scattered calls** (`services/fx.js`): `celebrateXp` turns an XP gain
   into either `+N XP` or `LEVEL UP! Lv N` (sound + toast, level computed from `utils/level`), and
   `FxLayer` renders the toasts (non-interactive, `aria-live=polite`, auto-expiring, max four).
4. **Settings**: `sfxEnabled` / `sfxVolume` live in `useUserStore` (persisted), exposed in
   Settings > General. Disabled or zero volume schedules nothing, including rain. Identical sounds
   within 45 ms are dropped so bursts cannot stack. Master gain is capped low (0.22 x volume).
5. **AFK nudge**: when a Focus check-in becomes due the HUD plays a chime (repeating each minute while
   ignored) and prefixes the tab title with a bell, restoring the title afterwards.

## Consequences

- Browsers keep an `AudioContext` suspended until a user gesture; sounds before the first gesture
  are silently dropped, which matches the policy and never throws.
- Verified: the engine schedules the expected number of oscillators in a real Chromium
  `AudioContext` (state `running`), the rain loop starts and stops cleanly, UI clicks trigger the
  blip, and toasts render. **Nobody has listened to it**: loudness, pitch and taste are
  unreviewed. The `/dev/ui` Sound Board plays every effect for that review; tune `SOUNDS` in `sfx.js`.
- There is no per-category volume (UI vs ambience) yet; rain uses the same slider.
- Coins earned from tasks/streaks do not celebrate yet (only Focus XP does); call `fxToast('coin', ..., 'coin')`
  where `addCoins` is used.
