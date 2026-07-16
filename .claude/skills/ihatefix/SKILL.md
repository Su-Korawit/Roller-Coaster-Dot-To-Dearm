---
name: ihatefix
description: Use when the user runs /ihatefix, reports a bug, says something is broken/throwing/failing/flaky, or describes a regression. Part of the korawit skills (ihateskill series) — disciplined diagnose-and-fix loop that lands on the same verify-push-report gate as the iloveskill series.
---

# /ihatefix

The ihateskill series counterpart to `/ilovetask`: features go through
plan → task → finish; bugs go through **fix → finish**. The discipline merges
the `diagnose` skill's feedback-loop method with superpowers:systematic-debugging
(root cause before fix) and superpowers:test-driven-development (regression test
before the fix). No plan file, no queue — bugs are fixed in Claude Code directly.

## Guards
- If `.iloveskill/current.json` exists but `.iloveskill/task-done.json` does **not**,
  a segment is still unfinished:
  - `executor: "cursor"` (or no `executor`) → Cursor may be editing this working tree
    right now. Say so and ask the user whether to proceed anyway or wait — do not
    silently race Cursor on the same files.
  - `executor: "claude"` → the segment just hasn't started (or was interrupted).
    Fixing first is fine — `/ilovefinish` knows not to promote past an idea that
    isn't in `completed` — but tell the user the pending idea will resume after the
    fix lands.
- If `task-done.json` exists (a finished segment awaits verification), invoke
  `/ilovefinish` first so the fix doesn't tangle with unverified batch work.

## Steps
1. **Intake.** Collect the bug report(s) from the user's message — symptom, where it
   appears, how to trigger it. Several bugs at once is normal; keep them as an ordered
   list and run steps 2–7 per bug. If a bug corresponds to an IR Board Idea, note its
   `ideaId` (ask only if the user hinted the board is involved).
2. **Build a feedback loop** (the `diagnose` skill, phase 1 — this is most of the work).
   Find a fast, deterministic, agent-runnable pass/fail signal: a failing Vitest test,
   a Node script against `src/lib`/`scripts`, a rules-emulator test, a curl against the
   dev server, or a headless-browser script. For flaky bugs, raise the reproduction
   rate (loop the trigger, add stress) until it's debuggable. If no loop is possible,
   stop and tell the user what artifact or access you need — do not guess at fixes.
3. **Reproduce.** Run the loop; confirm it shows the failure the user described, not a
   nearby different one.
4. **Hypothesise before touching code.** Write 3–5 ranked, falsifiable hypotheses
   ("if X is the cause, changing Y makes the bug disappear"). Show the list to the
   user — they often re-rank it instantly — but proceed with your ranking if they're
   away.
5. **Instrument.** Test one hypothesis at a time, changing one variable at a time.
   Tag every temporary log with a unique prefix like `[DEBUG-a4f2]` so cleanup is one
   grep. Keep going until the root cause is proven, not just suspected — never fix on
   a vibe.
6. **Regression test, then fix.** Turn the repro into a failing test at the correct
   seam, watch it fail, apply the smallest fix that addresses the root cause, watch it
   pass. If no correct seam exists, that is itself a finding — record it in the summary
   instead of writing a false-confidence test.
7. **Cleanup + commit.** Remove all `[DEBUG-...]` instrumentation (grep the prefix),
   delete throwaway harnesses, re-run the full loop plus `npm test`, then commit the
   fix as its own logical chunk. State the proven root cause in the commit message.
   Do **not** push.
8. **Hand off to the finish gate.** Merge an entry per bug into
   `.iloveskill/task-done.json` — append to `completed` if the file already exists,
   otherwise create `{ "completed": [...], "finishedAt": "<ISO-8601 now>" }`:
   - `{ ideaId: "<id>", ideaTitle, summary }` when the bug maps to an IR Board Idea;
   - `{ ideaId: null, ideaTitle: "<short bug title>", summary }` when it doesn't.
   Then invoke `/ilovefinish` to verify, push, and report.

## Standing rules
- Never push — `/ilovefinish` owns the push after verification.
- Never deploy rules/functions/indexes/vercel prod — enqueue into
  `.iloveskill/pending-deploys.json` instead.
- Never modify `StartNode` or user Roadmap behavior.
- Never read `serviceAccountKey.json` contents into the transcript.

## Red flags — stop and go back a phase
- "The fix is probably X, let me just try it" → no proven root cause yet (step 5).
- "I'll add the regression test after the fix" → test-first or record why not (step 6).
- "It works when I run it manually" → not a deterministic loop (step 2).
