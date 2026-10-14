// Weekly school leaderboard reader (ADR 0018). Everything here is public,
// school-level data written by the rollupSchoolWeek Cloud Function.
import { getDoc, getDocs } from 'firebase/firestore'
import { refs, queries } from '../lib/db'

export const LEADERBOARD_SIZE = 20
export const MIN_CONTRIBUTORS = 10   // keep in step with functions/leaderboardMath.js

// Returns { week, endsAtMs, updatedAt, schools: [{ rank, ...schoolWeek }], mine }
// or null when the rollup has never run. `mine` is the caller's school row
// even when it is unranked, so the UI can show "N more students to join the table".
export async function fetchLeaderboard({ mySchoolId = null } = {}) {
  const metaSnap = await getDoc(refs.leaderboardMeta())
  if (!metaSnap.exists()) return null
  const { week, endsAtMs, updatedAt } = metaSnap.data()

  const [topSnap, mineSnap] = await Promise.all([
    getDocs(queries.topSchools(week, LEADERBOARD_SIZE)),
    mySchoolId ? getDoc(refs.schoolWeek(mySchoolId, week)) : Promise.resolve(null),
  ])

  const schools = topSnap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }))
  const mine = mineSnap?.exists() ? mineSnap.data() : null
  return {
    week, endsAtMs, updatedAt, schools,
    mine: mine && { ...mine, rank: schools.find((s) => s.schoolId === mine.schoolId)?.rank ?? null },
  }
}

// Students still needed before a school appears on the table.
export const contributorsNeeded = (row) =>
  Math.max(0, MIN_CONTRIBUTORS - (row?.contributors ?? 0))
