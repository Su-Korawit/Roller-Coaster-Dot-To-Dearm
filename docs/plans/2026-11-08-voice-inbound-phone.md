# Voice secretary: call the phone number directly (inbound + tools)

**Goal:** the student dials the secretary's number from the phone number saved in the Secretary app. พี่ใจดี knows who is calling, knows the plan, and during the call can read today's schedule, read admission news (TCAS70 dates), add a task, move or complete a task. Same tools work on web calls and on calls she places.

**Architecture**
- Retell *inbound webhook* (`POST /api/voice/inbound`, signature-verified) → look up `voiceSecretary` by caller number → run the same gates as a web call (`consentValid`, trial/daily quota, global ceiling) → answer with `dynamic_variables` (name, plan, `student_context`) and `metadata {uid, callKey}`. Unknown or blocked caller → `inbound_unknown` mode: she explains how to register the number and ends the call.
- Retell *custom functions* (`POST /api/voice/tool`, signature-verified). The uid comes only from the call's `metadata`, and the call must hold a live, unsettled reservation. Pure logic in `api/_voice/tools.js`; the handler applies the result to `users/{uid}.os.tasks` in one Firestore transaction and bumps `osVoiceRev`.
- The OS client listens to its own user doc and re-hydrates the OS store when `osVoiceRev` changes, so a task added during the call appears on screen without a reload.
- `scripts/setupRetellVoice.mjs` (dry run by default) sets the inbound webhook on the phone number and adds the functions to the agent. Not run here; queued in `.lv/pending-deploys.json`.

**Known limits (say them in the demo notes)**
- The phone number in the app is typed by the student and not verified by SMS. Caller ID can be spoofed. Tools are limited to reading the plan and editing tasks. Add OTP verification before a public launch.
- Admission news is the built-in TCAS70 calendar (`src/data/tcasCalendar.js`, checked 2026-11-07), not live myTCAS.
- The Retell agent is a conversation flow; function nodes are added by the setup script and must be checked once in the dashboard.

## Tasks
- [ ] `tools.js` pure logic + tests (get_schedule, get_admission_news, add_task, move_tasks, complete_task)
- [ ] store: `findUidByPhone`, `readName`, `updateOs` (Firestore + memory)
- [ ] handler: `inbound` and `tool` actions + tests
- [ ] persona/prompt: `inbound_unknown`, tool instructions
- [ ] client: re-hydrate OS store on `osVoiceRev`
- [ ] `setupRetellVoice.mjs`, docs, pending deploy
