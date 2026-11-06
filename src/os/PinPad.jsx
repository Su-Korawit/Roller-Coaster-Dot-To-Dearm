import { useCallback, useEffect, useRef, useState } from 'react'
import { Delete } from 'lucide-react'
import { PIN_LENGTH } from './passcode'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

// PIN entry. Always listens to the physical keyboard (digits + Backspace). `showKeypad` adds the
// on-screen number pad (phones/iPads); without it (desktop) only the dots are shown.
// Calls onComplete(pin) at PIN_LENGTH digits, then clears itself. `shakeKey` changing → dots shake.
export default function PinPad({ onComplete, shakeKey = 0, disabled = false, dark = false, showKeypad = true }) {
  const [digits, setDigits] = useState('')
  const doneRef = useRef(onComplete)
  useEffect(() => { doneRef.current = onComplete }, [onComplete])

  const press = useCallback((k) => {
    if (disabled) return
    setDigits((d) => {
      if (k === 'back') return d.slice(0, -1)
      if (d.length >= PIN_LENGTH) return d
      return d + k
    })
  }, [disabled])

  // Submit + clear once the PIN is full (a side effect, so not inside the state updater).
  useEffect(() => {
    if (digits.length !== PIN_LENGTH) return undefined
    doneRef.current?.(digits)
    const t = setTimeout(() => setDigits(''), 180)
    return () => clearTimeout(t)
  }, [digits])

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('back')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  const ink = dark ? 'text-white' : 'text-ink'
  const dotOn = dark ? 'bg-white border-white' : 'bg-brand-strong border-line'
  const dotOff = dark ? 'border-white/70' : 'border-line-soft'
  const dotSize = showKeypad ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className="flex flex-col items-center gap-7 os-no-select">
      <div
        key={shakeKey}
        className={`flex gap-3 h-5 ${shakeKey ? 'os-shake' : ''}`}
        role="status"
        aria-label={`ใส่รหัสแล้ว ${digits.length} จาก ${PIN_LENGTH} ตัว`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`${dotSize} rounded-full border-2 ${i < digits.length ? dotOn : dotOff}`} />
        ))}
      </div>

      {showKeypad && (
        <div className="grid grid-cols-3 gap-x-5 gap-y-3 [@media(max-height:760px)]:gap-y-2">
          {KEYS.map((k, i) => (
            k === '' ? <span key={i} /> : (
              <button
                key={i}
                type="button"
                onClick={() => press(k)}
                disabled={disabled}
                aria-label={k === 'back' ? 'ลบ' : k}
                className={`w-16 h-16 [@media(max-height:760px)]:w-14 [@media(max-height:760px)]:h-14 rounded-full thai-font text-2xl font-semibold flex items-center justify-center
                  ${k === 'back' ? 'bg-transparent' : 'px-btn bg-paper'} ${k === 'back' && dark ? 'text-white' : 'text-ink'}
                  disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
              >
                {k === 'back' ? <Delete size={24} className={ink} aria-hidden="true" /> : k}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  )
}
