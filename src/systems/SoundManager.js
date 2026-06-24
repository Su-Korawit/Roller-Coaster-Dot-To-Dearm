const SOUND_URLS = {
  walk:    '/assets/sounds/walk.mp3',
  plant:   '/assets/sounds/plant.mp3',
  harvest: '/assets/sounds/harvest.mp3',
  buy:     '/assets/sounds/buy.mp3',
  sell:    '/assets/sounds/sell.mp3',
  door:    '/assets/sounds/door.mp3',
  newday:  '/assets/sounds/newday.mp3',
  error:   '/assets/sounds/error.mp3',
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

export class SoundManager {
  constructor() {
    this.context = null
    this.sounds = {}
    this.volume = 0.7
    this.muted = false
    this.enabled = false
  }

  async init() {
    if (this.enabled) return
    this.context = new (window.AudioContext || window.webkitAudioContext)()
    this.enabled = true
  }

  async load(key, url) {
    if (!this.context) return
    try {
      const response = await fetch(url)
      if (!response.ok) return
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer)
      this.sounds[key] = audioBuffer
    } catch {
      // skip missing files silently
    }
  }

  async loadAll() {
    await Promise.all(
      Object.entries(SOUND_URLS).map(([key, url]) => this.load(key, url))
    )
  }

  play(key, options = {}) {
    if (!this.enabled || this.muted || !this.sounds[key] || !this.context) return null

    const source = this.context.createBufferSource()
    const gain = this.context.createGain()

    source.buffer = this.sounds[key]
    source.playbackRate.value = options.rate ?? 1
    source.loop = options.loop ?? false

    gain.gain.value = options.volume ?? this.volume

    source.connect(gain)
    gain.connect(this.context.destination)
    source.start()

    return source
  }

  playWalk()    { return this.play('walk',    { volume: 0.3, rate: 1.2 }) }
  playPlant()   { return this.play('plant',   { volume: 0.6 }) }
  playHarvest() { return this.play('harvest', { volume: 0.8 }) }
  playBuy()     { return this.play('buy',     { volume: 0.6 }) }
  playSell()    { return this.play('sell',    { volume: 0.6 }) }
  playDoor()    { return this.play('door',    { volume: 0.7 }) }
  playNewDay()  { return this.play('newday',  { volume: 0.5 }) }
  playError()   { return this.play('error',   { volume: 0.4 }) }

  setVolume(v) {
    this.volume = clamp(v, 0, 1)
  }

  toggleMute() {
    this.muted = !this.muted
    return this.muted
  }

  setMuted(v) {
    this.muted = v
  }

  toJSON() {
    return { volume: this.volume, muted: this.muted }
  }

  fromJSON(data) {
    if (typeof data.volume === 'number') this.volume = clamp(data.volume, 0, 1)
    if (typeof data.muted === 'boolean') this.muted = data.muted
  }
}

export const sound = new SoundManager()
