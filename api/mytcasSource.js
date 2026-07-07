// api/mytcasSource.js
// Pure decision logic for /api/mytcas degraded-mode handling. No imports, no
// I/O — the handler does the fetching, these functions decide what to serve.
// Tested in api/mytcasSource.test.js (the handler itself is not a test seam).

// Live courses.json below this row count means MyTCAS is mid-rebuild for a new
// TCAS cycle (the full dataset is tens of thousands of rows; 2026-07-07 it
// briefly held ~180).
export const MIN_LIVE_ROWS = 5000

export function pickCourseSource({ liveRows, snapshotRows, minRows = MIN_LIVE_ROWS }) {
  const live = Array.isArray(liveRows) ? liveRows : []
  const snapshot = Array.isArray(snapshotRows) ? snapshotRows : []
  if (live.length >= minRows) return { rows: live, source: 'live' }
  if (snapshot.length > live.length) return { rows: snapshot, source: 'snapshot' }
  return { rows: live, source: 'live' }
}

export function resolveTcasYear(meta, fallbackYear) {
  const year = Number(meta?.tcasYear)
  // Sanity window: Buddhist-era years around the app's lifetime.
  if (Number.isInteger(year) && year >= 2560 && year <= 2620) return year
  return fallbackYear
}

export function buildRoundsPayload(programId, tcasYear, rounds) {
  return {
    program_id: programId,
    tcas_year: tcasYear,
    rounds,
    announced: rounds.length > 0,
  }
}
