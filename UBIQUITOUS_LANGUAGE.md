# Ubiquitous Language

## IR Board (Admin Idea-Request)

| Term                | Definition                                                                                              | Aliases to avoid                  |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **IR Board**        | The single shared admin canvas for collecting ideas — a fixed sheet doc `roadmapSheets/admin-idea-board` | Admin roadmap, idea page, IR page |
| **Idea**            | One unit of requested work: an **Idea Root Block** plus every block attached under it                    | Request, task, block group        |
| **Idea Root Block** | The head block of an Idea; carries the Idea's title and **Idea Status**                                  | Start block, idea block           |
| **Idea Status**     | Lifecycle of an Idea: `idea` → `planned` → `in-progress` → `done`                                        | State, progress                   |
| **Update Block**    | An IR-Board-only block reporting partial progress or a blocker (summary + timestamp)                     | Progress block, report block      |
| **Success Block**   | An IR-Board-only block recording completed work (summary + timestamp)                                    | Done block, complete block        |

## korawit skills

| Term                     | Definition                                                                                                     | Aliases to avoid            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **korawit skills**       | Umbrella for the project workflow commands: the **iloveskill series** + the **ihateskill series**               | iloveskill v2, my skills    |
| **iloveskill series**    | The feature pipeline: `/iloveplan` → `/ilovetask` → `/ilovefinish` (+ `/unlock-bkb`)                            | ilove skills, IR tools      |
| **ihateskill series**    | The bug pipeline: `/ihatefix` → `/ilovefinish` (+ `/unlock-bkb`)                                                | fix skills, bug tools       |
| **/iloveplan**           | Claude Code skill: lists non-`done` Ideas from the IR Board, user picks idea(s) + an Executor each, writes a Plan File per idea | —           |
| **/ilovetask**           | Executor command, one per tool: Claude Code skill and Cursor command (`.cursor/commands/ilovetask.md`) — each drains its own Segment of the queue | —  |
| **/ilovefinish**         | Claude Code skill (renamed from `/ilovework`): tests → push to main → reports Update/Success Blocks → hands the queue to the next Executor | /ilovework |
| **/ihatefix**            | Claude Code skill: diagnose-and-fix loop (feedback loop → hypotheses → regression test → fix), lands on `/ilovefinish` | —                    |
| **/unlock-bkb**          | Claude Code skill: runs every command in the Pending Deploy Queue in one authorized batch, then clears it       | —                           |
| **Executor**             | Which tool implements an Idea: `claude` (Claude Code) or `cursor` (Cursor); stored per queue item, missing = `cursor` | Owner, runner         |
| **Segment**              | A consecutive run of same-Executor Ideas at the head of the queue; one `/ilovetask` session drains one Segment  | Chunk, batch part           |
| **Plan File**            | Markdown plan at `docs/plans/YYYY-MM-DD-<slug>.md`, written by `/iloveplan`, consumed by `/ilovetask`           | Spec, handoff               |
| **Current Work State**   | `.iloveskill/current.json` (gitignored): ideaId, ideaTitle, planPath, and Executor of the Idea being worked on  | Session file, context       |
| **Pending Deploy Queue** | `.iloveskill/pending-deploys.json` (gitignored): permission-heavy commands deferred until `/unlock-bkb`         | Deploy list, lock file      |
| **IR Reporter**          | `scripts/irReport.mjs` — Node script using `serviceAccountKey.json` to read/write the IR Board from the CLI     | Sync script                 |

## People

| Term            | Definition                                                                                     | Aliases to avoid |
| --------------- | ---------------------------------------------------------------------------------------------- | ---------------- |
| **Admin**       | Anyone whose email appears in `ADMIN_ROLES` — every Admin sees the IR tab regardless of section | Staff, editor    |
| **Super-admin** | The developer account (`ADMIN_UID`), holder of every admin section                              | Owner, dev       |

## Relationships

- The **IR Board** contains many **Ideas**; each **Idea** has exactly one **Idea Root Block**.
- An **Idea Root Block** may have many **Update Blocks** but at most one **Success Block**.
- **/iloveplan** moves an Idea to `planned` and creates one **Plan File** + the **Current Work State** (with an **Executor** per Idea).
- **/ilovefinish** appends an **Update Block** (Idea stays `in-progress`) or a **Success Block** (Idea becomes `done`); `/ihatefix` fixes with no IR Idea skip the board.
- Each **/ilovetask** (Claude Code or Cursor) drains one **Segment**; **/ilovefinish** promotes the next Segment to the other Executor.
- The **Pending Deploy Queue** outlives the **Current Work State** — finishing an Idea does not flush the queue; only **/unlock-bkb** does, and only after the whole queue is drained.

## Example dialogue

> **Dev:** "ผมกด `/iloveplan` แล้วมันโชว์ **Idea** ทั้งหมดเลยเหรอ?"
>
> **Domain expert:** "เฉพาะที่ **Idea Status** ยังไม่ `done` — มันอ่าน **Idea Root Block** จาก **IR Board** ผ่าน **IR Reporter** แล้วให้เลือกได้หลายอัน พร้อมระบุ **Executor** ว่าแต่ละอันให้ Claude หรือ Cursor ทำ"
>
> **Dev:** "แล้ว Cursor รู้ได้ยังไงว่าต้องทำแผนไหน?"
>
> **Domain expert:** "`/ilovetask` อ่าน **Current Work State** ซึ่งชี้ไปที่ **Plan File** — ไม่ต้องบอกซ้ำ"
>
> **Dev:** "ถ้างานติด rules ต้อง deploy ล่ะ?"
>
> **Domain expert:** "`/ilovefinish` จะไม่ deploy เอง — คำสั่งเข้า **Pending Deploy Queue** แล้วรายงานเป็น **Update Block** จนกว่าคุณจะสั่ง **/unlock-bkb**"

## Flagged ambiguities

- **"Block Start" ≠ Idea Root Block.** ข้อเสนอเดิม (1.1) จะแก้ Start block ให้รับเส้นเข้าได้ — ตัดทิ้งแล้ว: **Idea Root Block** เป็น type ใหม่บน IR Board, `StartNode` ของ Roadmap ผู้ใช้ไม่ถูกแตะ
- **"Roadmap" is overloaded.** Roadmap = ฟีเจอร์ของ user เท่านั้น; บอร์ดฝั่ง admin เรียก **IR Board** เสมอ (แม้จะเก็บใน `roadmapSheets` เหมือนกัน)
- **"bkb"** — ยังไม่ได้นิยามว่าย่อมาจากอะไร; ใช้เป็นชื่อ opaque ของ skill ไปก่อน
- **"Admin ทุกคน"** = ทุก email ใน `ADMIN_ROLES` ไม่สน section ที่ถือ — ไม่ใช่ทุก user
