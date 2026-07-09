import { currentSite } from './site'

const FEATURE_SITES = new Set(['roadmap', 'tcas', 'news', 'school'])

export function isFeatureSite() {
  return FEATURE_SITES.has(currentSite)
}
