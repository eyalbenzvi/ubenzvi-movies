import { forwardRef } from 'react'
import { digitsToDisplay } from '../lib/time.js'

/**
 * Timer-style time field: the user types digits only (Android's numeric keyboard has no ":"),
 * filled from the right — 2210 shows as 22:10. Pasted "22:10" works too (separators are ignored).
 */
const TimeInput = forwardRef(function TimeInput({ digits, onDigits, invalid, describedBy, onEnter, dark = false, autoFocus = false, label = 'זמן' }, ref) {
  const display = digitsToDisplay(digits)
  const onChange = (e) => {
    const value = e.target.value
    let next = value.replace(/\D/g, '')
    // Deleting the ":" (no digit removed) should remove the last digit instead
    if (next === digits && value.length < display.length) next = digits.slice(0, -1)
    onDigits(next.replace(/^0+(?=\d)/, '').slice(0, 6))
  }
  return (
    <label className="flex shrink-0 flex-col gap-1">
      <span className={`text-xs font-medium ${dark ? 'text-stone-300' : 'text-muted'}`}>{label}</span>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        dir="ltr"
        autoComplete="off"
        enterKeyHint="next"
        autoFocus={autoFocus}
        value={display}
        onChange={onChange}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }}
        onFocus={(e) => { const el = e.target; requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length)) }}
        placeholder="22:10"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`h-12 w-28 rounded-xl border text-center text-xl font-semibold tabular-nums outline-none transition focus:ring-2 ${
          invalid
            ? 'border-rose-500 focus:ring-rose-500/30'
            : dark
              ? 'border-stone-600 bg-stone-800 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/30'
              : 'border-line-strong bg-surface placeholder:text-subtle focus:border-focus focus:ring-focus/25'
        } ${dark && invalid ? 'bg-stone-800 text-white' : ''}`}
      />
    </label>
  )
})

export default TimeInput
