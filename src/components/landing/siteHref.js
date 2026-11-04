import { SITES } from '../../constants/sites'

// Link to another site of the family: path-relative in development (?site=), real path in production.
export function siteHref(key) {
  if (import.meta.env.DEV) return `/?site=${key}`
  return SITES[key].path
}
