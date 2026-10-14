// Game-feel feedback in one place: a sound plus an on-screen toast, so callers
// (Focus, tasks, shop…) say WHAT happened and not how to celebrate it.
import { playSound } from '../lib/sfx'
import { useFxStore } from '../stores/useFxStore'
import { levelFromXp } from '../utils/level'

export function fxToast(kind, text, sound) {
  if (sound) playSound(sound)
  return useFxStore.getState().push({ kind, text })
}

// XP was just awarded: `before` is the lifetime total prior to `gained`.
// Returns { leveledUp, level } (level = the level after the gain).
export function celebrateXp({ before = 0, gained = 0 }) {
  const g = Number(gained)
  if (!(g > 0)) return { leveledUp: false, level: levelFromXp(before) }
  const levelBefore = levelFromXp(before)
  const level = levelFromXp(before + g)
  if (level > levelBefore) {
    fxToast('levelup', `LEVEL UP! Lv ${level}`, 'levelup')
    return { leveledUp: true, level }
  }
  fxToast('xp', `+${g} XP`, 'coin')
  return { leveledUp: false, level }
}

export const fxError = () => playSound('error')
