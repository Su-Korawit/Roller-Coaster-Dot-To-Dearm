---
name: lv-edit
description: Use when the user runs /lv-edit, wants to change or tweak something that already exists, reports a bug, or says something is broken/failing/flaky. Surgical edit, or diagnose-and-fix for bugs; commits locally (no push).
---

# /lv-edit

Change existing behavior. Two modes, pick from the request:

## A. Tweak (copy, style, small behavior change)
1. Find the code (grep `src/`), read the surrounding file, make the smallest change that does it.
2. Update or add a test if a seam exists. Run `npm test` for the touched area.
3. Commit locally.

## B. Bug / regression
1. **Feedback loop first.** Get a fast deterministic pass/fail signal: failing Vitest test, Node script, rules-emulator test, curl against dev server. If none is possible, stop and say what you need. No guessing.
2. **Reproduce** the failure the user actually described.
3. **Hypothesise** 3-5 ranked, falsifiable causes before touching code.
4. **Instrument** one variable at a time; tag temporary logs `[DEBUG-xxxx]`. Prove the root cause.
5. **Regression test, then fix** (smallest fix at the root cause).
6. **Cleanup:** grep and remove every `[DEBUG-` tag, delete throwaway harnesses, re-run `npm test`.
7. Commit the fix on its own; state the proven root cause in the message.

Never push. Tell the user: `/lv-preview` to look, `/lv-push` to ship.

## Standing rules
- Never deploy; queue commands in `.lv/pending-deploys.json` instead.
- Never read `serviceAccountKey.json` contents into the transcript.
- Never modify `StartNode` or user Roadmap behavior.
- Red flags: "probably X, let me try it" (no proven root cause), "I'll add the test after" (test first).
