import { SITES } from '../constants/sites'

const VALID_SITES = new Set(Object.keys(SITES))
const APEX = 'ilovetcas.com'

/**
 * Map a hostname to its Site key (ADR-0012).
 *
 * Canonical hosts (`ilovetcas.com` and its subdomains) resolve from the
 * hostname alone — a real domain can never serve another site's tree. The
 * `?site=` / `VITE_SITE` override only applies on non-canonical hosts
 * (localhost, `*.vercel.app` previews) so every site stays testable there.
 * Anything unrecognised falls back to `app`: existing users on the legacy
 * vercel.app origin keep exactly the pre-restructure behaviour.
 */
export function resolveSite(hostname, search) {
  const host = (hostname || '').toLowerCase()
  const isCanonical = host === APEX || host.endsWith(`.${APEX}`)

  if (!isCanonical) {
    const override = new URLSearchParams(search || '').get('site') || import.meta.env.VITE_SITE
    if (override && VALID_SITES.has(override)) return override
    return 'app'
  }

  if (host === APEX || host === `www.${APEX}`) return 'hub'
  const sub = host.slice(0, -(APEX.length + 1))
  if (VALID_SITES.has(sub)) return sub
  return 'app'
}

export const currentSite = resolveSite(
  typeof window !== 'undefined' ? window.location.hostname : 'localhost',
  typeof window !== 'undefined' ? window.location.search : '',
)
