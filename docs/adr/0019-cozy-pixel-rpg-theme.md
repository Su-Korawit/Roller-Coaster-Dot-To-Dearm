# 0019 — Cozy pixel RPG theme (Sprout Lands UI)

**Status:** accepted
**Date:** 2026-10-14

## Context

The app was a purple/navy "neo-brutalist pixel kawaii" surface language with hard
black drop shadows. The School World (ADR 0018) makes the product a game-like place
students stay in all day, and the owner asked for a cozy pixel RPG feel. The Sprout
Lands UI pack (Cup Nooble, already licensed and already in `public/assets/ui/`)
provides the visual language: warm parchment panels, plum outlines, wooden planks,
leaf-green progress bars, heart-purple accents.

## Decision

1. **Re-skin through the existing tokens and class names**, not component by component.
   `@theme` in `src/index.css` takes the pack's palette (`#f3e5c2` paper, `#dcb98a` wood,
   `#90625d` edge, `#8a4a70` heart-purple brand, `#c0d470` lime, ink `#4b3340`), and
   `.neo-card/.neo-slab/.neo-btn/.neo-sheet/.neo-input` keep their names and 2px border
   metrics but draw parchment panels (light inner ring, darker bottom ledge, hard drop
   ledge). Every screen that already used them changes with no layout shift.
2. **Pure-CSS chrome, not 9-slice images.** Sprites were cropped to
   `public/assets/ui/panels/` for reference, but panels are CSS so they scale to any
   content without pixel-ratio and padding surprises. Images are used where they carry
   character: the School Hub map as title-screen scenery (`backdrops/school-hub.png`,
   rendered from `public/maps/school_hub.json`), a pixel cloud, and the MBTI sprites.
3. **A small RPG vocabulary** in CSS: `.rpg-plank` (panel title plank), `.rpg-bar`
   (+ `--heart`) for XP/timers, `.rpg-btn-primary`/`-danger`, `.rpg-coin` (level coin),
   `.animate-pop`, `.px-cloud`, `.px-sky-bg`, wooden scrollbars. All motion is stepped and
   disabled under `prefers-reduced-motion`.
4. **Level is shown where an MMO shows it**: a coin + thin XP bar pinned to the HUD avatar
   (`LevelBadge`), fed by `users/{uid}.focusXp` through `useUserStore.focusXp`.
5. **A dev-only style guide** at `/dev/ui` (`DevUiKit`, tree-shaken from production) renders every
   shared surface with mock state, so theme changes can be judged without signing in.

## Consequences

- Chat, Social, Shop, the match overlay and the public profile sheet were converted in a second pass
  (parchment rows, wooden headers, warm bubbles, item-slot product cards). Hard-coded colours that
  predate the theme remain in a few screens (roadmap edges, admin, onboarding, mbtiColors). They
  still work but read as the old palette; sweep them as those screens are touched.
- `.neo-btn` keeps its default corner radius in `@layer components` so `rounded-full` /
  `rounded-lg` utilities on buttons still win; the other `neo-*` classes are unlayered and override
  radius utilities (as `neo-card` always did).
- Text colour is now a deep plum-brown rather than near-black; contrast on the parchment
  surfaces is ≥ 7:1, but any component that paired `text-ink` with a *dark* background needs checking.
- `shadow-hard`/`shadow-hard-sm` now offset straight down (a "ledge") instead of down-right.
- Verified visually only on public pages (sign-in, hub, UI kit) at desktop and 375px mobile;
  signed-in screens (Home HUD, panels in the game) were not seen running.
