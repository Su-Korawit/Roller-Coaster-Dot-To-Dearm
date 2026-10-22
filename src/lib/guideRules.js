import { GUIDE_STEPS } from '../constants/guideSteps'

export const GUIDE_END = GUIDE_STEPS.length
export const FRESH_GUIDE = { started: false, step: 0, done: false, skipped: false }

// users/{uid}.guide / rc-guide: never throws, anything malformed is a fresh guide.
export const sanitizeGuide = (d) => ({
  started: d?.started === true,
  step: Number.isInteger(d?.step) && d.step >= 0 ? Math.min(d.step, GUIDE_END) : 0,
  done: d?.done === true,
  skipped: d?.skipped === true,
})
