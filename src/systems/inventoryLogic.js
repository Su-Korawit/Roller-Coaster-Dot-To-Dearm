// Pure, immutable helpers for slot-based inventory.
// A slot is `null` or `{ itemId, count }`. No imports.

export function countInSlots(slots, itemId) {
  let total = 0
  for (const slot of slots) {
    if (slot && slot.itemId === itemId) total += slot.count
  }
  return total
}

// Add `count` of itemId into a fresh copy of `slots`, respecting stackMax.
// Returns { slots, remaining }; remaining > 0 means the slots filled up.
export function addToSlots(slots, itemId, count, stackMax) {
  const next = slots.map((s) => (s ? { ...s } : null))
  let remaining = count

  for (let i = 0; i < next.length && remaining > 0; i++) {
    const slot = next[i]
    if (slot && slot.itemId === itemId) {
      const canAdd = stackMax - slot.count
      if (canAdd > 0) {
        const add = Math.min(remaining, canAdd)
        slot.count += add
        remaining -= add
      }
    }
  }

  for (let i = 0; i < next.length && remaining > 0; i++) {
    if (next[i] === null) {
      const add = Math.min(remaining, stackMax)
      next[i] = { itemId, count: add }
      remaining -= add
    }
  }

  return { slots: next, remaining }
}

// Remove `count` of itemId from a fresh copy of `slots`.
// Returns { slots, removed }; removed < count means not enough were present.
export function removeFromSlots(slots, itemId, count) {
  const next = slots.map((s) => (s ? { ...s } : null))
  let toRemove = count

  for (let i = 0; i < next.length && toRemove > 0; i++) {
    const slot = next[i]
    if (slot && slot.itemId === itemId) {
      const take = Math.min(toRemove, slot.count)
      slot.count -= take
      toRemove -= take
      if (slot.count === 0) next[i] = null
    }
  }

  return { slots: next, removed: count - toRemove }
}
