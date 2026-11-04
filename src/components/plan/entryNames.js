import { programs, universities } from '../../data/onboardingData'

// Display names for a plan entry. Entries from the Open House carry their names; programs picked
// in onboarding only carry ids, which the onboarding data can name.
export const programName = (e) =>
  e?.programName ?? programs.find((p) => p.id === e?.program)?.name ?? e?.program ?? 'หลักสูตร'

export const universityName = (e) =>
  e?.universityName ?? universities.find((u) => u.id === e?.university)?.name ?? ''

// A slot with nothing chosen yet (addPlan before a program is picked) is not a plan entry.
export const isPlanEntry = (e) => Boolean(e?.programId || e?.program || e?.university || e?.round != null)
