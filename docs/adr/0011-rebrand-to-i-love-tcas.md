# 0011 — Rebrand: Roller Coaster → I LOVE TCAS

**Status:** accepted
**Date:** 2026-07-09

## Context

The product launched under the working name "Roller Coaster" (styled inconsistently
as `ROLLER COASTER`, `Roller Coaster`, and `RollerCoaster` across the app). The owner
has purchased the domain **ilovetcas.com** and wants the public identity to match.

The old name is embedded at two very different depths:

1. **User-visible surfaces** — hero, TopBar, auth pages, onboarding, footer,
   browser `<title>`, shop AI persona, PromptPay merchant name, News tab label.
2. **Internal identifiers** — `rc-*` localStorage keys, the `rc/` Firebase Storage
   prefix, the Firebase project id `rollercoasterdottodream`, the repo/folder name,
   `package.json` name.

Renaming the internal identifiers carries real cost: `rc-*` key renames would drop
persisted state on every returning user's device unless a migration is written, the
Firebase project id cannot be changed at all, and the `rc/` prefix is wired into
storage rules, upload scripts, and the artist's Admin-upload workflow (ADR 0007).

## Decision

Name-only rebrand, **user-facing scope only**.

- **Canonical wordmark: `I LOVE TCAS`** — all caps, three words, everywhere
  (hero, TopBar, footer, auth, onboarding, AI persona, PromptPay merchant name).
  The old triple-styling (`RollerCoaster` etc.) is retired; there is exactly one
  way to write the name.
- **Positioning is unchanged** — still gamified career planning (MBTI, roadmap,
  farm, social) with TCAS data as one pillar. The rebrand does not refocus the
  product; hero copy keeps its current message.
- **Browser `<title>`**: `I LOVE TCAS — วางแผนเส้นทางสู่มหาลัยแบบเกม`, plus a Thai
  meta description for search results.
- **News Panel app-updates tab** is relabeled **"อัปเดตแอป"** (not "I LOVE TCAS")
  so it cannot be confused with the real-TCAS news tab sitting next to it. The
  internal tab key `rollercoaster` stays.
- **PromptPay merchant fallback** becomes `I LOVE TCAS`
  (still overridable via `VITE_MERCHANT_NAME`).
- **Untouched:** `rc-*` localStorage keys, `rc/` storage prefix, Firebase project
  id / bucket, repo + folder name, `package.json` name, `vercel.json` name. These
  are treated as internal legacy identifiers, documented in CONTEXT.md.
- **Domain rollout:** ilovetcas.com is **added alongside** the existing
  `*.vercel.app` URL for now — no redirect yet. Console steps (owner):
  1. Vercel project → Domains → add `ilovetcas.com` (+ `www`).
  2. Firebase Console → Auth → Settings → Authorized domains → add
     `ilovetcas.com` (Google sign-in breaks on the new domain without this).
  Storage CORS already allows `*` for GET — no change needed.

## Considered options

- **Full rename including internals** — rejected: localStorage migration risk,
  immutable Firebase project id, churn in storage rules/scripts for zero user value.
- **`I Love TCAS` / `ILOVETCAS` casings** — rejected in favour of a single all-caps
  wordmark that matches the existing pixel-font hero treatment and the domain.
- **Hard domain switch with redirect** — deferred; both URLs run in parallel until
  the owner is confident, then a redirect can follow.

## Consequences

- Grep for `roller`/`coaster` in `src/` should hereafter only hit internal
  identifiers (`rc-*`, `rc/`, project id) and historical changelog entries.
- The "RC" logo monogram (auth + onboarding) is replaced with an interim "ILT"
  text mark; a proper I LOVE TCAS pixel logo is follow-up work for the artist.
- CONTEXT.md becomes the glossary authority for the wordmark and for the
  legacy-internal-names rule.
- Old app-update feed entries that referenced the "RollerCoaster tab" are edited
  to say "แท็บอัปเดตแอป" so they don't point users at a tab name that no longer
  exists.
