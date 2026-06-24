const PERIODS = ['morning', 'day', 'evening', 'night']

const PERIOD_COLORS = {
  morning: { r: 255, g: 200, b: 100, alpha: 0.15 },
  day:     { r: 0,   g: 0,   b: 0,   alpha: 0    },
  evening: { r: 255, g: 100, b: 0,   alpha: 0.25 },
  night:   { r: 0,   g: 0,   b: 80,  alpha: 0.5  },
}

function progressToPeriod(progress) {
  if (progress < 0.25) return 'morning'
  if (progress < 0.50) return 'day'
  if (progress < 0.75) return 'evening'
  return 'night'
}

export class DayNightSystem {
  constructor(dayDurationSeconds = 600) {
    this.dayDuration = dayDurationSeconds * 1000
    this.elapsed = 0
    this.dayCount = 1
    this.listeners = []
    this._lastPeriod = 'morning'
  }

  update(deltaMs) {
    this.elapsed += deltaMs

    if (this.elapsed >= this.dayDuration) {
      this.elapsed -= this.dayDuration
      this.dayCount++
      this._emit('newDay', { day: this.dayCount })
    }

    const progress = this.elapsed / this.dayDuration
    const period = progressToPeriod(progress)

    if (period !== this._lastPeriod) {
      this._lastPeriod = period
      this._emit('periodChanged', { period, progress })
    }
  }

  getProgress() {
    return Math.min(this.elapsed / this.dayDuration, 1)
  }

  getPeriod() {
    return progressToPeriod(this.getProgress())
  }

  getTimeString() {
    // Map 0-100% to 6:00-30:00 (6am to 6am next day = 24h span)
    const totalMinutes = Math.floor(this.getProgress() * 24 * 60)
    const hours = (6 + Math.floor(totalMinutes / 60)) % 24
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  getDayCount() {
    return this.dayCount
  }

  getOverlayColor() {
    return PERIOD_COLORS[this.getPeriod()]
  }

  on(event, cb) {
    this.listeners.push({ event, cb })
  }

  off(event, cb) {
    this.listeners = this.listeners.filter(l => !(l.event === event && l.cb === cb))
  }

  _emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.cb(data)
      }
    }
  }

  toJSON() {
    return { elapsed: this.elapsed, dayCount: this.dayCount }
  }

  fromJSON(data) {
    if (typeof data.elapsed === 'number') this.elapsed = data.elapsed
    if (typeof data.dayCount === 'number') this.dayCount = data.dayCount
    this._lastPeriod = progressToPeriod(this.getProgress())
  }
}

export const createDayNightSystem = () => new DayNightSystem()
