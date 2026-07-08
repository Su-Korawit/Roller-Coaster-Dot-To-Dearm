// Pure timeline logic for the TCAS Calendar — no imports, no I/O.

export function splitTcasEvents(events, todayStr) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
  return {
    passed: sorted.filter((e) => e.date < todayStr),
    upcoming: sorted.filter((e) => e.date >= todayStr),
  }
}
