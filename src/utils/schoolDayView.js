// src/utils/schoolDayView.js
// Pure day-view logic for the School System — no imports, no I/O. Tested
// standalone in schoolDayView.test.js; the store and UI only call these.

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// Parses 'YYYY-MM-DD' as a LOCAL date (not UTC) so the weekday is correct
// regardless of the runtime's timezone offset.
export function dayKeyFromDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return DAY_KEYS[new Date(y, m - 1, d).getDay()]
}

export function slotsForDay(scheduleSlots, dayKey) {
  return scheduleSlots
    .filter((slot) => slot.day === dayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function appointmentsDueOn(appointments, dateStr) {
  return appointments
    .filter((a) => a.dueDate === dateStr)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return a.createdAt - b.createdAt
    })
}

export function isOverdue(appointment, todayStr) {
  return !appointment.completed && appointment.dueDate < todayStr
}
