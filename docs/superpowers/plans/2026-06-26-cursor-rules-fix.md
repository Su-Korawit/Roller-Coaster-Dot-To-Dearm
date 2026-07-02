# Cursor Rules Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the stale ADR number and add two high-risk missing rules to the always-on Cursor rules file, without disturbing anything else.

**Architecture:** Three edits across two Markdown files. (1) Replace the hardcoded "next ADR = 0007" in both `project.mdc` and `CLAUDE.md` with a self-describing rule so it never drifts again. (2)+(3) Add a new `## Precautions` section to `project.mdc` carrying the store-auto-sync and dual-backend rules. No code, no tests — these are documentation/config files.

**Tech Stack:** Markdown only. `.cursor/rules/project.mdc` is a Cursor rules file with `alwaysApply: true` frontmatter (injected into every Cursor prompt).

## Global Constraints

- Only the three changes below. Do NOT reformat, reorder, or rewrite any other section of either file.
- Do NOT change the `alwaysApply`, `description`, or any frontmatter field of `project.mdc`.
- Do NOT add explanatory comments outside the three changes.
- The `## Precautions` section does not currently exist in `project.mdc` — create it new. (The "append if it already exists" clause from the request does not trigger.)
- Verbatim source of truth for the new rules: `CONTEXT.md:225` (debounced writes) and `CONTEXT.md:226` (dual backends).

---

### Task 1: Make the ADR number self-describing in both files

**Files:**
- Modify: `.cursor/rules/project.mdc:16`
- Modify: `CLAUDE.md` (the `## ADR Numbering` section)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing depended on by later tasks (Task 2 is independent).

- [ ] **Step 1: Edit `project.mdc:16`**

Replace this exact line:

```markdown
Next ADR number: **0007** (`docs/adr/0007-<kebab>.md`).
```

with:

```markdown
Next ADR number: the next integer after the highest-numbered file in `docs/adr/` (`docs/adr/NNNN-<kebab>.md`).
```

- [ ] **Step 2: Edit the `## ADR Numbering` section in `CLAUDE.md`**

Replace this exact line:

```markdown
Next ADR: **0007**. Path: `docs/adr/0007-<kebab-name>.md`.
```

with:

```markdown
Next ADR: the next integer after the highest-numbered file in `docs/adr/`. Path: `docs/adr/NNNN-<kebab-name>.md`.
```

- [ ] **Step 3: Verify no stale "next ADR" hardcode remains**

Run: `grep -n "0007" .cursor/rules/project.mdc CLAUDE.md`
Expected: no match referring to the *next* ADR number. (A match pointing at the existing ADR *filename* would be fine, but neither file should now have one after the edits above.)

- [ ] **Step 4: Commit**

```bash
git add .cursor/rules/project.mdc CLAUDE.md
git commit -m "fix: make next-ADR number self-describing to stop drift"
```

---

### Task 2: Add `## Precautions` section to `project.mdc`

**Files:**
- Modify: `.cursor/rules/project.mdc` (append a new section at end of file, after `## Asset Manifest`)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Append the new section**

Add to the very end of `.cursor/rules/project.mdc`:

```markdown

---

## Precautions

- **Store mutations auto-sync.** Zustand store writes are debounced (~1 s) to Firestore by `syncManager`. Never add manual `saveToFirestore()` calls, `localStorage`, or `useEffect` save timers — mutate the store and let the writer persist.
- **Dual backends.** External data → Vercel `/api/*`; payments / business logic → Firebase Cloud Functions (via the Firebase SDK). Don't mix them.
```

- [ ] **Step 2: Verify the diff is surgical**

Run: `git diff .cursor/rules/project.mdc`
Expected: exactly one changed line (Task 1) plus the appended `## Precautions` section. Frontmatter (`description`, `alwaysApply`) untouched. No other hunks.

- [ ] **Step 3: Commit**

```bash
git add .cursor/rules/project.mdc
git commit -m "docs: add Precautions section (store auto-sync, dual backends) to Cursor rules"
```

---

## Self-Review

- **Spec coverage:** Three requested changes — ADR fix (Task 1, both files), store-auto-sync rule + dual-backend rule (Task 2). All covered.
- **Placeholder scan:** None — all content is literal.
- **Constraint check:** Frontmatter untouched; no other sections reformatted; Precautions created new (not pre-existing). Wording traces to `CONTEXT.md:225–226`.

## Verification (end-to-end)

1. `git diff` of both files shows only the three intended changes — 1 line in `CLAUDE.md`; 1 line + 1 appended section in `project.mdc`.
2. New Precautions wording matches `CONTEXT.md` truth (debounced sync; dual backend split).
3. Open `project.mdc` in Cursor and confirm the rule still loads (valid frontmatter, `alwaysApply: true` intact).
