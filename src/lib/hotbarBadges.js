export const localToday = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Tasks scheduled for today and not done yet (the badge on the tasks slot).
export const dueTodayCount = (tasks, today = localToday()) =>
  (tasks ?? []).filter((t) => !t.completed && t.scheduledDate === today).length
