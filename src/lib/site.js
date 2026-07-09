// Stub resolver — Claude Code Task 1.1 will replace with hostname rules + tests.
import { SITES } from '../constants/sites'

const VALID_SITES = new Set(Object.keys(SITES))

export function resolveSite(hostname, search) {
  const params = new URLSearchParams(search || '')
  const override = params.get('site') || import.meta.env.VITE_SITE
  if (override && VALID_SITES.has(override)) return override

  if (hostname === 'ilovetcas.com' || hostname === 'www.ilovetcas.com') return 'hub'

  const subMatch = hostname.match(/^([a-z]+)\.ilovetcas\.com$/)
  if (subMatch && VALID_SITES.has(subMatch[1])) return subMatch[1]

  return 'app'
}

export const currentSite = resolveSite(
  typeof window !== 'undefined' ? window.location.hostname : 'localhost',
  typeof window !== 'undefined' ? window.location.search : '',
)
