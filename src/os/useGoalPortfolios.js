import { useEffect, useState } from 'react'
import { loadUniversityProjects, findProgram } from './checklistProjects'
import { portfolioDeadlines } from './countdownLogic'

// Portfolio (round 1) deadlines of each goal, loaded from the university snapshots.
// -> { [goalId]: { status: 'none' | 'error' | 'ready', rows: [...] } } (a goal is missing until it has loaded).
export function useGoalPortfolios(goals, today) {
  const [byGoal, setByGoal] = useState({})
  const key = goals.map((g) => `${g.id}:${g.universityId}:${g.programId}`).join('|')
  useEffect(() => {
    let alive = true
    goals.forEach(async (g) => {
      if (!g.universityId || !g.programId) { if (alive) setByGoal((m) => ({ ...m, [g.id]: { status: 'none', rows: [] } })); return }
      const shard = await loadUniversityProjects(g.universityId)
      if (!alive) return
      if (!shard) { setByGoal((m) => ({ ...m, [g.id]: { status: 'error', rows: [] } })); return }
      setByGoal((m) => ({ ...m, [g.id]: { status: 'ready', rows: portfolioDeadlines(findProgram(shard, g.programId), today) } }))
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, today])
  return byGoal
}
