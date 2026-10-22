// ============================================================================
// sfx.js — procedural 8-bit sound effects + an ambient rain loop (WebAudio).
// ----------------------------------------------------------------------------
// No audio files: every sound is a few oscillator notes, so there is nothing to
// license, host or download, and the cost is a couple of kB. Playback respects the
// student's settings (useUserStore.sfxEnabled / sfxVolume), is throttled so a burst
// of clicks cannot stack, and silently does nothing where WebAudio is unavailable
// (tests, old browsers) or the browser still blocks audio before a user gesture.
// ============================================================================
import { useUserStore } from '../stores/useUserStore'

// A note: t = start offset (s), f = frequency (Hz), f2 = optional glide target,
// d = duration (s), type = oscillator wave, g = relative gain 0-1.
const N = (t, f, d, g = 0.6, type = 'square', f2) => ({ t, f, d, g, type, f2 })

export const SOUNDS = {
  click:   [N(0, 740, 0.045, 0.45)],
  open:    [N(0, 523, 0.07, 0.5), N(0.06, 784, 0.11, 0.5)],
  close:   [N(0, 659, 0.06, 0.45), N(0.05, 440, 0.1, 0.45)],
  success: [N(0, 523, 0.08), N(0.08, 659, 0.08), N(0.16, 784, 0.16)],
  coin:    [N(0, 988, 0.07, 0.55), N(0.07, 1319, 0.22, 0.55)],
  chime:   [N(0, 880, 0.16, 0.5, 'triangle'), N(0.18, 1175, 0.3, 0.5, 'triangle')],
  emote:   [N(0, 600, 0.1, 0.45, 'triangle', 900)],
  error:   [N(0, 196, 0.12, 0.5, 'sawtooth'), N(0.12, 147, 0.2, 0.5, 'sawtooth')],
  levelup: [
    N(0, 523, 0.1), N(0.1, 659, 0.1), N(0.2, 784, 0.1), N(0.3, 1047, 0.12),
    N(0.45, 784, 0.08), N(0.53, 1047, 0.35),
  ],
}

const MIN_GAP_MS = 45          // same sound within this window is dropped
const MASTER = 0.22            // overall loudness ceiling (before the student's volume)

let ctx = null
const lastPlayed = new Map()

export function settings() {
  // A store that cannot be read (partial mocks, early boot) means defaults, never a crash:
  // sound is decoration and must not be able to break a screen.
  let s = {}
  try { s = useUserStore.getState() ?? {} } catch { /* defaults */ }
  return {
    enabled: s.sfxEnabled !== false,
    volume: Number.isFinite(s.sfxVolume) ? Math.min(1, Math.max(0, s.sfxVolume)) : 0.5,
  }
}

function getCtx() {
  if (ctx) return ctx
  const Ctor = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null
  if (!Ctor) return null
  try { ctx = new Ctor() } catch { ctx = null }
  return ctx
}

function wake(c) {
  if (c.state === 'suspended') c.resume?.().catch(() => {})
}

// Schedule one note on `c`. Returns the oscillator (for tests).
function note(c, n, start, level) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = n.type
  osc.frequency.setValueAtTime(n.f, start + n.t)
  if (n.f2) osc.frequency.linearRampToValueAtTime(n.f2, start + n.t + n.d)
  const peak = Math.max(0.0001, n.g * level)
  gain.gain.setValueAtTime(0.0001, start + n.t)
  gain.gain.linearRampToValueAtTime(peak, start + n.t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + n.t + n.d)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(start + n.t)
  osc.stop(start + n.t + n.d + 0.02)
  return osc
}

// Play a named effect. Returns true when notes were scheduled.
export function playSound(name, { now = () => Date.now() } = {}) {
  const def = SOUNDS[name]
  if (!def) return false
  const { enabled, volume } = settings()
  if (!enabled || volume <= 0) return false

  const t = now()
  if (t - (lastPlayed.get(name) ?? -Infinity) < MIN_GAP_MS) return false
  lastPlayed.set(name, t)

  const c = getCtx()
  if (!c) return false
  wake(c)
  const start = c.currentTime + 0.005
  const level = MASTER * volume
  for (const n of def) note(c, n, start, level)
  return true
}

// ── Ambient rain loop (night library) ───────────────────────────────────────
let rain = null

export function isRaining() { return rain !== null }

export function startRain() {
  if (rain) return true
  const { enabled, volume } = settings()
  if (!enabled || volume <= 0) return false
  const c = getCtx()
  if (!c) return false
  wake(c)

  // 2 s of white noise, looped, band-limited so it reads as rain rather than hiss.
  const length = c.sampleRate * 2
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000
  const gain = c.createGain()
  const level = 0.07 * volume
  gain.gain.setValueAtTime(0.0001, c.currentTime)
  gain.gain.linearRampToValueAtTime(level, c.currentTime + 1.5)   // gentle fade-in
  src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(c.destination)
  src.start()
  rain = { src, gain, c }
  return true
}

export function stopRain() {
  if (!rain) return
  const { src, gain, c } = rain
  rain = null
  try {
    gain.gain.cancelScheduledValues(c.currentTime)
    gain.gain.setValueAtTime(gain.gain.value ?? 0.05, c.currentTime)
    gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.6)
    src.stop(c.currentTime + 0.65)
  } catch { /* already stopped */ }
}

// ── Global UI click sound ───────────────────────────────────────────────────
const CLICKABLE = 'button, [role="button"], [role="tab"], [role="switch"], a[href], .px-btn'

export function shouldClick(target) {
  const el = target?.closest?.(CLICKABLE)
  if (!el) return false
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false
  if (el.closest('[data-no-sfx]')) return false
  return true
}

// One delegated listener for the whole app; returns the cleanup function.
export function installUiSounds(root = typeof document !== 'undefined' ? document : null) {
  if (!root) return () => {}
  const onDown = (e) => { if (shouldClick(e.target)) playSound('click') }
  root.addEventListener('pointerdown', onDown, true)
  return () => root.removeEventListener('pointerdown', onDown, true)
}

export function _resetForTest() {
  ctx = null
  rain = null
  lastPlayed.clear()
}
