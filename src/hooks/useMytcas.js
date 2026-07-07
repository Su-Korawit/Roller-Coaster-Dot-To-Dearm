// hooks/useMytcas.js
// React hooks for TCAS course data
// Uses /api/mytcas serverless function via the shared useMytcasFetch lifecycle.

import { useMytcasFetch } from './useMytcasFetch'

// Deterministic CDN logo URL — single source of truth, reused by pages + profile.
export const tcasLogoUrl = (id) => `https://assets.mytcas.com/i/logo/${id}.png`

// ── Hook: list all universities ──────────────────────────────────────────────
export function useTcasUniversities() {
  const { data, loading, error, refetch } = useMytcasFetch({}, [])
  return {
    universities: data?.universities ?? [],
    total: data?.total ?? 0,
    dataSource: data?.data_source ?? 'live',
    loading,
    error,
    refetch,
  }
}

// ── Hook: faculties of a university ─────────────────────────────────────────
export function useTcasFaculties(university_id) {
  const { data, loading, error, refetch } = useMytcasFetch(
    { university_id },
    [university_id],
    { enabled: !!university_id },
  )
  return { faculties: data?.faculties ?? [], data, loading, error, refetch }
}

// ── Hook: programs inside a faculty ─────────────────────────────────────────
export function useTcasPrograms(university_id, faculty_id) {
  const { data, loading, error, refetch } = useMytcasFetch(
    { university_id, faculty_id },
    [university_id, faculty_id],
    { enabled: !!university_id && !!faculty_id },
  )
  return { programs: data?.programs ?? [], data, loading, error, refetch }
}

// ── Hook: single program detail ──────────────────────────────────────────────
export function useTcasProgram(program_id) {
  const { data, loading, error, refetch } = useMytcasFetch(
    { program_id },
    [program_id],
    { enabled: !!program_id },
  )
  return { program: data, loading, error, refetch }
}

// ── Hook: admission rounds for a program ─────────────────────────────────────
export function useTcasRounds(program_id) {
  const { data, loading, error, refetch } = useMytcasFetch(
    { program_id, rounds: 'true' },
    [program_id],
    { enabled: !!program_id },
  )
  return {
    rounds: data?.rounds ?? [],
    announced: data?.announced ?? true,
    tcasYear: data?.tcas_year ?? null,
    loading,
    error,
    refetch,
  }
}
