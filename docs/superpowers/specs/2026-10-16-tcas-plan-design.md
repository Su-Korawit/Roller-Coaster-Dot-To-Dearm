# TCAS Plan — automatic application plan

**Date:** 2026-10-16 · **Status:** draft for review · **Overview:** [2026-10-16-ilovetcas-v2-overview.md](2026-10-16-ilovetcas-v2-overview.md)
**Mockup:** `assets/2026-10-16-ilovetcas-v2/mockups/plan.html`

## Purpose

A user-friendly replacement for building a Roadmap by hand. The student only picks programs ("+ เพิ่มเข้าแผน" in the Open House popup); the app works out **what is required** (scores, GPAX, portfolio) and **when** (TCAS calendar), shows the next thing to do, and turns the exam subjects of all chosen programs into **focus-hour goals** that start a study session in one tap.

The React Flow Roadmap stays as **advanced mode** (Bag → Roadmap, and `roadmap.ilovetcas.com`); it is no longer the main path.

## Model — extend the existing Plans, don't fork

`usePlansStore` already holds `plans: [{ id, university, program, addedAt }]`, capped by `FREE_PLAN_SLOTS + extraPlanSlots()` and persisted through `shapes.profileFields` / `readProfile`. The Plan extends each entry (versioned, backward compatible):

```js
{
  id, addedAt,
  university, program,            // existing display fields (kept for onboarding/profile)
  programId, universityId, buildingId,   // new: links to the Open House index
  round: 1 | 2 | 3 | 4 | null,    // null = "ยังไม่เลือกรอบ" (migrated old entries)
  rank: 1..10 | null,             // round 3 order (TCAS allows up to 10)
  projectName: string | null,     // chosen project within the round, if several
  checklist: [{ id, text, done, source: 'auto' | 'user' }],
}
```

- Old entries load with `round: null` and keep working in onboarding/profile.
- The slot cap is unchanged (business model untouched). Hitting the cap shows the existing Unlock path.
- Guests (`/openhouse`): same store under `rc-plans-store` + `rc-guest-dirty`; `sessionBootstrap` guest-merge rules apply (cloud empty → merge; else ask).

## Adding from the popup

"+ เพิ่มเข้าแผน" opens a round picker for that program: each round shows status — open / "ปิดรับแล้ว" (from calendar dates) / "ยังไม่ประกาศ" (no projects in index) / round 2 always notes "ตรวจเงื่อนไขพื้นที่ใน MyTCAS" (the index has no province data, so we never claim eligibility). Round 3 proposes the next free rank. Success → toast "เพิ่ม <program> เข้ารอบ N อันดับ M แล้ว" with "ดูแผน".

**Auto checklist** from the chosen round's project: `GPAX ≥ x`, one item per exam score key ("สอบ A-Level ฟิสิกส์"), portfolio → "เตรียม Portfolio", interview → "สัมภาษณ์". Users can tick, add, delete their own items.

## Plan sheet (Hotbar item 3)

1. **Header:** "แผน TCAS<year> ของฉัน" + countdown to the next exam/apply milestone.
2. **Round filter:** ทั้งหมด / รอบ 1–4.
3. **ต้องทำต่อไป:** the nearest dated milestone touching any entry, with its checklist progress.
4. **Round lists:** round 3 drag-to-rank (1–10, `@hello-pangea/dnd` already in the stack); each row shows score-weight chips. Tap → program detail (same data as the popup) with remove/move-round actions.
5. **วิชาที่ต้องสอบ:** union of score keys across entries, sorted by number of programs using them; each with hours studied / goal and **อ่าน** → FocusSetupSheet pre-filled with that subject.

## Calendar data

Dates come from the admin-curated **TCAS Events** (`tcasEvents`). Extend the event shape with optional `round`, `kind: 'apply' | 'exam' | 'announce' | 'other'`, `examKeys: string[]` (e.g. `['a_lv_64']`), and an admin form update. If no event matches, the plan shows no date rather than inventing one.

## Subject goals & focus link

- Default goal hours per subject: `20 + round5(60 × maxWeight / 100)` (maxWeight = highest weight of that key among entries); editable.
- Hours studied per subject: `endFocus` increments `users/{uid}.focusBySubject.{key}` (ms, Functions-owned) when a session carries `subjectKey`. Read-only on the client.

## Code map

| New / changed | Purpose |
|---|---|
| `src/stores/usePlansStore.js` | new fields + actions `addFromProgram`, `setRound`, `rankRound3`, `toggleChecklist`, `addChecklistItem`; migration in `readProfile` |
| `src/lib/db.js` | `shapes.profileFields/readProfile` carry the new fields; `shapes.tcasEvent` gains optional fields |
| `src/utils/planDerive.js` | pure: auto checklist, next milestone, subject aggregation, default goals, round status |
| `src/components/plan/*` | PlanSheet, RoundPicker, PlanEntryRow, SubjectGoalRow, NextUpCard |
| `functions/` `endFocus` | `focusBySubject` increment |
| admin TCAS events form | new optional fields |

## Testing

- Unit (`planDerive`): checklist generation from real project fixtures, subject aggregation/sort, default goal formula, next milestone selection, round status (open/closed/unannounced), migration of old entries.
- Store: cap enforcement, rank uniqueness 1–10, guest dirty marking.
- Functions emulator: `focusBySubject` only increments with a valid key.
- E2E: add 3 programs from the campus → plan shows ranks, subjects, next milestone → tap อ่าน → focus starts with the subject.

## Out of scope

Eligibility checks by province/school type, score prediction / admission chance, AI advice, sharing plans publicly.
