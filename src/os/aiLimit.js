// Usage limit for the AI chat: N messages per day and M per week (weeks run Mon–Sun, like the reading board).
// Pure functions. `log` is { 'YYYY-MM-DD': count }. Kept on the device (see useAiUsageStore), so it is a
// fair-use guard, not a security boundary; hard enforcement would need the call to go through a server.
import { weekStartKey } from './studyPlan'
import { shiftKey } from './lifeLogic'

export const AI_LIMITS = { day: 20, week: 80 }

const count = (v) => (Number.isFinite(v) && v > 0 ? v : 0)

// Drop everything older than this week's Monday so the log never grows.
export function pruneUsage(log = {}, today) {
  const start = weekStartKey(today)
  return Object.fromEntries(Object.entries(log).filter(([day, n]) => day >= start && day <= today && count(n) > 0))
}

export function usageCounts(log = {}, today) {
  const start = weekStartKey(today)
  const week = Object.entries(log).reduce((a, [day, n]) => (day >= start && day <= today ? a + count(n) : a), 0)
  return { day: count(log[today]), week }
}

// { allowed, reason: null | 'day' | 'week', left } — `left` is how many messages can still be sent right now.
export function checkLimit(log = {}, today, limits = AI_LIMITS) {
  const used = usageCounts(log, today)
  const dayLeft = Math.max(0, limits.day - used.day)
  const weekLeft = Math.max(0, limits.week - used.week)
  const left = Math.min(dayLeft, weekLeft)
  const reason = weekLeft === 0 ? 'week' : dayLeft === 0 ? 'day' : null
  return { allowed: left > 0, reason, left, dayLeft, weekLeft, used, limits }
}

export function recordUse(log = {}, today) {
  const next = pruneUsage(log, today)
  next[today] = count(next[today]) + 1
  return next
}

// When the blocking limit opens again: tomorrow for the daily limit, next Monday for the weekly one.
export function resetKey(reason, today) {
  return reason === 'week' ? shiftKey(weekStartKey(today), 7) : shiftKey(today, 1)
}

export function limitMessage(reason) {
  return reason === 'week'
    ? 'สัปดาห์นี้น้องคุยกับพี่ครบโควตาแล้ว โควตาจะรีเซ็ตวันจันทร์หน้านะ ระหว่างนี้ดูแผนใน Habit ไปก่อนได้เลย'
    : 'วันนี้น้องคุยกับพี่ครบโควตาแล้ว พรุ่งนี้มาคุยกันใหม่นะ'
}
