# 0018 — School Community World (MVP)

**Status:** proposed
**Date:** 2026-10-14

## Context

I LOVE TCAS has strong tools (Roadmap, School, News, TCAS search, File Bag) and a
Phaser world with RTDB presence, but no *reason to stay open all day* and no
*social proof per school*. The goal is a cozy pixel "school in a game" students
leave open while studying (AFK), where each school is its own community.

Apply 80/20: ship only the slice that makes the product visibly different and is
MVP-ready. Everything else is deferred.

Facts verified in code:
- `schoolId` on the user is a Google Places `place_id` (SocialPanel), top-level so Firestore can query it.
- Presence is `/worlds/{ownerUid}/maps/{mapKey}/players/{uid}` (`src/lib/presence.js`); a room is any `(ownerUid, mapKey)` pair.
- Tiled `Interactions` layer supports `action: 'shop' | 'chest'` (`src/utils/tiledMapMeta.js`).
- ADR-0004: game state that matters is server-authoritative.

## Decision

1. **One map, many rooms.** A single authored map `school_hub`. A School Server is a
   presence room keyed `ownerUid = "school:{schoolId}"`, `mapKey = "school_hub"`. No per-school map authoring.
2. **Rooms open on a threshold.** Until a school has >= `SCHOOL_ROOM_MIN_MEMBERS` (30) registered members,
   its users share a regional room (`"region:{n}"`). Empty rooms feel dead; density beats breadth.
   Rooms cap at 50 concurrent players and shard (`#2`, `#3`).
3. **Buildings are doors to existing tools, not new systems.** Library = Focus seats;
   Canteen = news/announcement board (`tcasEvents` + teacher posts); Guidance room = Roadmap portal;
   Contest board = camphub. Exam/sheet sharing (Library shelf) is **deferred** (copyright + moderation).
4. **Focus session is the unit of value and is server-authoritative.** Only verified
   Focus sessions (periodic check-in, daily cap 8h) earn XP and count toward the leaderboard.
   Merely having the tab open earns nothing. Written by Cloud Functions only.
5. **Leaderboard ranks by average verified hours per member**, weekly (ISO week, Asia/Bangkok),
   minimum 10 contributing members, so big schools do not win by size and AFK idling cannot game it.
6. **AFK mode is a first-class state**: low-frequency presence heartbeat, Phaser FPS throttled
   when idle/hidden, hidden-idle avatars drop out of the room's rendered set.
7. **Minor-safety defaults in school rooms**: no free-text chat (preset emotes only), no real name shown
   (display name + avatar), report/block present before any text chat is added.
8. **Teacher badge** is a Firebase custom claim `teacher: true` granted by an admin callable after
   manual verification; teachers may post to their school's board. No client-side email lists.
9. **Share image is opt-in** and excludes name/school by default.

## Considered options

- Per-school custom maps — rejected (authoring cost, no density).
- Count raw online time for the leaderboard — rejected (trivially gamed, meaningless).
- Rank by total hours — rejected (large schools always win, discourages the rest).
- Library exam sharing in MVP — rejected (copyright takedowns + moderation load before we have users).
- Free-text chat in rooms — rejected for MVP (minors; moderation).

## Consequences

- New RTDB rules for `worlds/school:*` and `worlds/region:*` rooms.
- New Firestore: `focusSessions`, `schoolWeeks`, `users/{uid}.focusXp` (Functions-owned like Coins), rules + indexes.
- New Functions: `startFocus`, `checkInFocus`, `endFocus`, scheduled `rollupSchoolWeek`, `grantTeacherBadge`.
- `tiledMapMeta` gains new interaction actions (`focusSeat`, `board`, `tool`).
- Gate before any public pilot: Privacy Policy/ToS/consent + account deletion (PDPA), because minors.
