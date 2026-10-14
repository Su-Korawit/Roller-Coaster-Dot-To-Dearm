import React from 'react'
import { ItemSprite } from './ItemSprite'

// Stardew-style quick bar: one horizontal wooden strip docked bottom-centre, above the music
// player and nav. The selected slot gets a bright frame. Gold lives in the top HUD, not here.
export function Hotbar({ slots = [], selectedIndex = 0, onSelectSlot = () => {} }) {
  return (
    <div
      role="toolbar"
      aria-label="ช่องเก็บของ"
      data-testid="hotbar"
      className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 156px)' }}
    >
      <div className="rpg-plank pointer-events-auto flex gap-1 p-1 rounded-md">
        {slots.map((slot, i) => {
          const selected = selectedIndex === i
          return (
            <button
              key={i}
              type="button"
              aria-label={slot ? `ช่อง ${i + 1}: ${slot.itemId} x${slot.count}` : `ช่อง ${i + 1} (ว่าง)`}
              aria-pressed={selected}
              onClick={() => onSelectSlot(i)}
              className={`relative flex items-center justify-center w-9 h-9 md:w-11 md:h-11 shrink-0 rounded-sm border-2 transition-colors ${
                selected
                  ? 'border-ink bg-wood-light shadow-[0_0_0_2px_var(--color-lime)]'
                  : 'border-wood-edge bg-wood-dark/50 hover:bg-wood-light/60'
              }`}
            >
              {slot && (
                <>
                  <ItemSprite itemId={slot.itemId} size={28} />
                  {slot.count > 1 && (
                    <span className="absolute bottom-0 right-0.5 pixel-font text-[8px] leading-none text-ink [text-shadow:1px_1px_0_var(--color-wood-light)]">
                      {slot.count}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
