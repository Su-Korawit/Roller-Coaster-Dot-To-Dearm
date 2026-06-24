const DEFAULT_ICONS = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
  warning: '⚠️',
}

const DEFAULT_DURATION = 2500

export class NotificationSystem {
  constructor() {
    this.notifications = []
    this.nextId = 1
    this.listeners = []
  }

  show(message, options = {}) {
    const type = options.type ?? 'info'
    const icon = options.icon ?? DEFAULT_ICONS[type]
    const duration = options.duration ?? DEFAULT_DURATION
    const id = this.nextId++

    const notification = {
      id,
      type,
      message,
      icon,
      duration,
      createdAt: Date.now(),
    }

    this.notifications.push(notification)
    this._emit('changed', this.notifications)

    setTimeout(() => {
      this.dismiss(id)
    }, duration)

    return id
  }

  success(message, duration) {
    return this.show(message, { type: 'success', duration })
  }

  error(message, duration) {
    return this.show(message, { type: 'error', duration })
  }

  info(message, duration) {
    return this.show(message, { type: 'info', duration })
  }

  warning(message, duration) {
    return this.show(message, { type: 'warning', duration })
  }

  planted(plantName) {
    return this.success(`ปลูก ${plantName} แล้ว! 🌱`)
  }

  harvested(plantName, count) {
    return this.success(`เก็บ ${plantName} x${count} แล้ว! 🎉`)
  }

  bought(itemName, count, gold) {
    return this.success(`ซื้อ ${itemName} x${count} (-${gold}g) 💰`)
  }

  sold(itemName, count, gold) {
    return this.success(`ขาย ${itemName} x${count} (+${gold}g) 💰`)
  }

  newDay(dayCount) {
    return this.info(`☀️ วันที่ ${dayCount} เริ่มแล้ว!`, 3000)
  }

  inventoryFull() {
    return this.warning('กระเป๋าเต็มแล้ว! 🎒')
  }

  notEnoughGold(need) {
    return this.error(`เงินไม่พอ ต้องการ ${need}g 💸`)
  }

  dismiss(id) {
    const before = this.notifications.length
    this.notifications = this.notifications.filter(n => n.id !== id)
    if (this.notifications.length !== before) {
      this._emit('changed', this.notifications)
    }
  }

  dismissAll() {
    this.notifications = []
    this._emit('changed', this.notifications)
  }

  on(event, cb) {
    this.listeners.push({ event, cb })
    return () => this.off(event, cb)
  }

  _emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.cb(data)
      }
    }
  }

  off(event, cb) {
    this.listeners = this.listeners.filter(l => !(l.event === event && l.cb === cb))
  }
}

export const notify = new NotificationSystem()
