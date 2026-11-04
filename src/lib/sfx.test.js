// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useUserStore } from '../stores/useUserStore'
import {
  SOUNDS, playSound, startRain, stopRain, isRaining, shouldClick, installUiSounds, _resetForTest,
} from './sfx'

// A just-enough fake AudioContext that records what gets scheduled.
let created
function installFakeAudio() {
  created = { ctx: null, oscillators: [], sources: [], resumed: 0 }
  class FakeParam {
    constructor() { this.value = 0 }
    setValueAtTime() {}
    linearRampToValueAtTime() {}
    exponentialRampToValueAtTime() {}
    cancelScheduledValues() {}
  }
  class FakeCtx {
    constructor() {
      this.currentTime = 10
      this.sampleRate = 8000
      this.state = 'suspended'
      this.destination = {}
      created.ctx = this
    }
    resume() { created.resumed += 1; this.state = 'running'; return Promise.resolve() }
    createOscillator() {
      const o = { type: '', frequency: new FakeParam(), connect() {}, start: vi.fn(), stop: vi.fn() }
      created.oscillators.push(o)
      return o
    }
    createGain() { return { gain: new FakeParam(), connect() {} } }
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} } }
    createBuffer(_ch, len) { return { getChannelData: () => new Float32Array(len) } }
    createBufferSource() {
      const s = { buffer: null, loop: false, connect() {}, start: vi.fn(), stop: vi.fn() }
      created.sources.push(s)
      return s
    }
  }
  vi.stubGlobal('AudioContext', FakeCtx)
  window.AudioContext = FakeCtx
}

beforeEach(() => {
  _resetForTest()
  installFakeAudio()
  useUserStore.setState({ sfxEnabled: true, sfxVolume: 0.5 })
})
afterEach(() => { vi.unstubAllGlobals(); delete window.AudioContext })

describe('playSound', () => {
  it('schedules one oscillator per note, woken from the suspended state', () => {
    expect(playSound('levelup')).toBe(true)
    expect(created.oscillators).toHaveLength(SOUNDS.levelup.length)
    expect(created.resumed).toBe(1)
    created.oscillators.forEach((o) => { expect(o.start).toHaveBeenCalled(); expect(o.stop).toHaveBeenCalled() })
  })

  it('every defined sound is well-formed (positive freq/duration, gain 0-1, known wave)', () => {
    for (const [name, notes] of Object.entries(SOUNDS)) {
      expect(notes.length, name).toBeGreaterThan(0)
      for (const n of notes) {
        expect(n.f).toBeGreaterThan(20)
        expect(n.f).toBeLessThan(5000)
        expect(n.d).toBeGreaterThan(0)
        expect(n.d).toBeLessThan(1)
        expect(n.g).toBeGreaterThan(0)
        expect(n.g).toBeLessThanOrEqual(1)
        expect(['square', 'triangle', 'sawtooth', 'sine']).toContain(n.type)
      }
    }
  })

  it('does nothing when sound effects are switched off or the volume is zero', () => {
    useUserStore.setState({ sfxEnabled: false })
    expect(playSound('click')).toBe(false)
    useUserStore.setState({ sfxEnabled: true, sfxVolume: 0 })
    expect(playSound('click')).toBe(false)
    expect(created.oscillators).toHaveLength(0)
  })

  it('ignores unknown names and survives a browser without WebAudio', () => {
    expect(playSound('nope')).toBe(false)
    _resetForTest()
    vi.unstubAllGlobals()
    delete window.AudioContext
    expect(playSound('click')).toBe(false)
  })

  it('drops the same sound inside the throttle window but allows it afterwards and allows other sounds', () => {
    let t = 1000
    const now = () => t
    expect(playSound('click', { now })).toBe(true)
    t = 1010
    expect(playSound('click', { now })).toBe(false)
    expect(playSound('coin', { now })).toBe(true)
    t = 1100
    expect(playSound('click', { now })).toBe(true)
  })

  it('survives an unreadable store (falls back to defaults instead of throwing)', async () => {
    const spy = vi.spyOn(useUserStore, 'getState').mockImplementation(() => { throw new Error('boom') })
    expect(() => playSound('click', { now: () => 5 })).not.toThrow()
    expect(playSound('coin', { now: () => 5 })).toBe(true)
    spy.mockRestore()
  })

  it('treats an unset volume as the default 0.5 and clamps wild values', () => {
    useUserStore.setState({ sfxVolume: undefined })
    expect(playSound('click', { now: () => 1 })).toBe(true)
    useUserStore.setState({ sfxVolume: 99 })
    expect(playSound('coin', { now: () => 1 })).toBe(true)
  })
})

describe('rain loop', () => {
  it('starts once, is idempotent, and stops with a fade', () => {
    expect(startRain()).toBe(true)
    expect(isRaining()).toBe(true)
    expect(startRain()).toBe(true)
    expect(created.sources).toHaveLength(1)
    expect(created.sources[0].loop).toBe(true)
    expect(created.sources[0].start).toHaveBeenCalled()
    stopRain()
    expect(isRaining()).toBe(false)
    expect(created.sources[0].stop).toHaveBeenCalled()
    stopRain()                                   // second stop is a no-op
  })

  it('will not start when sound is off', () => {
    useUserStore.setState({ sfxEnabled: false })
    expect(startRain()).toBe(false)
    expect(isRaining()).toBe(false)
  })
})

describe('UI click sound', () => {
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d); return d }
  afterEach(() => { document.body.innerHTML = '' })

  it('fires for buttons, links, tabs, switches and .px-btn — but not for plain text or disabled/aria-disabled controls', () => {
    const d = el(`
      <button id="b">x</button><a id="a" href="/x">x</a><div id="t" role="tab">x</div>
      <div id="s" role="switch">x</div><div id="n" class="px-btn">x</div><p id="p">x</p>
      <button id="dis" disabled>x</button><div id="ad" role="button" aria-disabled="true">x</div>
      <div data-no-sfx><button id="q">x</button></div>
      <button id="inner"><span id="child">x</span></button>`)
    const q = (id) => d.querySelector(`#${id}`)
    for (const id of ['b', 'a', 't', 's', 'n', 'child']) expect(shouldClick(q(id)), id).toBe(true)
    for (const id of ['p', 'dis', 'ad', 'q']) expect(shouldClick(q(id)), id).toBe(false)
    expect(shouldClick(null)).toBe(false)
  })

  it('one delegated listener plays "click" on pointerdown and is removable', () => {
    const d = el('<button id="b">x</button>')
    const off = installUiSounds(document)
    d.querySelector('#b').dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(created.oscillators.length).toBe(SOUNDS.click.length)
    off()
    _resetForTest(); installFakeAudio()
    d.querySelector('#b').dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(created.oscillators).toHaveLength(0)
  })
})
