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

## iloveskill series

| Term                     | Definition                                                                                                   | Aliases to avoid       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| **iloveskill series**    | The four project-level workflow commands: `/iloveplan`, `/ilovetask`, `/ilovework`, `/unlock-bkb`             | ilove skills, IR tools |
| **/iloveplan**           | Claude Code skill: lists non-`done` Ideas from the IR Board, user picks one, writes a Plan File for Cursor    | —                      |
| **/ilovetask**           | Cursor command (`.cursor/commands/ilovetask.md`): reads the Current Work State and implements the Plan File   | —                      |
| **/ilovework**           | Claude Code skill: tests → push to main → reports back to the IR Board with an Update or Success Block        | —                      |
| **/unlock-bkb**          | Claude Code skill: runs every command in the Pending Deploy Queue in one authorized batch, then clears it     | —                      |
| **Plan File**            | Markdown plan at `docs/plans/YYYY-MM-DD-<slug>.md`, written by `/iloveplan`, consumed by `/ilovetask`         | Spec, handoff          |
| **Current Work State**   | `.iloveskill/current.json` (gitignored): the ideaId, ideaTitle, and planPath of the Idea being worked on      | Session file, context  |
| **Pending Deploy Queue** | `.iloveskill/pending-deploys.json` (gitignored): permission-heavy commands deferred until `/unlock-bkb`       | Deploy list, lock file |
| **IR Reporter**          | `scripts/irReport.mjs` — Node script using `serviceAccountKey.json` to read/write the IR Board from the CLI   | Sync script            |

## People

| Term            | Definition                                                                                     | Aliases to avoid |
| --------------- | ---------------------------------------------------------------------------------------------- | ---------------- |
| **Admin**       | Anyone whose email appears in `ADMIN_ROLES` — every Admin sees the IR tab regardless of section | Staff, editor    |
| **Super-admin** | The developer account (`ADMIN_UID`), holder of every admin section                              | Owner, dev       |

## Relationships

- The **IR Board** contains many **Ideas**; each **Idea** has exactly one **Idea Root Block**.
- An **Idea Root Block** may have many **Update Blocks** but at most one **Success Block**.
- **/iloveplan** moves an Idea to `planned` and creates one **Plan File** + the **Current Work State**.
- **/ilovework** appends an **Update Block** (Idea stays `in-progress`) or a **Success Block** (Idea becomes `done`).
- The **Pending Deploy Queue** outlives the **Current Work State** — finishing an Idea does not flush the queue; only **/unlock-bkb** does.

## Example dialogue

> **Dev:** "ผมกด `/iloveplan` แล้วมันโชว์ **Idea** ทั้งหมดเลยเหรอ?"
>
> **Domain expert:** "เฉพาะที่ **Idea Status** ยังไม่ `done` — มันอ่าน **Idea Root Block** จาก **IR Board** ผ่าน **IR Reporter** แล้วให้เลือกอันเดียว"
>
> **Dev:** "แล้ว Cursor รู้ได้ยังไงว่าต้องทำแผนไหน?"
>
> **Domain expert:** "`/ilovetask` อ่าน **Current Work State** ซึ่งชี้ไปที่ **Plan File** — ไม่ต้องบอกซ้ำ"
>
> **Dev:** "ถ้างานติด rules ต้อง deploy ล่ะ?"
>
> **Domain expert:** "`/ilovework` จะไม่ deploy เอง — คำสั่งเข้า **Pending Deploy Queue** แล้วรายงานเป็น **Update Block** จนกว่าคุณจะสั่ง **/unlock-bkb**"

## Flagged ambiguities

- **"Block Start" ≠ Idea Root Block.** ข้อเสนอเดิม (1.1) จะแก้ Start block ให้รับเส้นเข้าได้ — ตัดทิ้งแล้ว: **Idea Root Block** เป็น type ใหม่บน IR Board, `StartNode` ของ Roadmap ผู้ใช้ไม่ถูกแตะ
- **"Roadmap" is overloaded.** Roadmap = ฟีเจอร์ของ user เท่านั้น; บอร์ดฝั่ง admin เรียก **IR Board** เสมอ (แม้จะเก็บใน `roadmapSheets` เหมือนกัน)
- **"bkb"** — ยังไม่ได้นิยามว่าย่อมาจากอะไร; ใช้เป็นชื่อ opaque ของ skill ไปก่อน
- **"Admin ทุกคน"** = ทุก email ใน `ADMIN_ROLES` ไม่สน section ที่ถือ — ไม่ใช่ทุก user
