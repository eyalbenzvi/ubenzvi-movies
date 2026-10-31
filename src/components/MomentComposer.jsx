import { useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import TimeInput from './TimeInput.jsx'
import { normalize } from '../lib/search.js'
import { formatTime, parseTimeInput } from '../lib/time.js'

/**
 * Compact panel for marking a moment: time (as shown in the player) + what happens.
 * Rendered under the bar in the small player, and inside the full-screen overlay (`dark`).
 * The player is never covered or reloaded while it is open.
 */
export default function MomentComposer({ movie, moments, tags, allTags, onSave, onClose, dark = false, autoFocus = false }) {
  const [digits, setDigits] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState(null)
  const [focused, setFocused] = useState(false)
  const labelRef = useRef(null)
  const timeRef = useRef(null)
  const hintId = useId()

  const chips = useMemo(() => {
    const list = [...moments.map((m) => m.tag), ...tags, ...movie.suggestedTags, ...allTags.map((t) => t.name)]
    return [...new Set(list)].slice(0, 8)
  }, [moments, tags, movie.suggestedTags, allTags])

  const options = useMemo(() => {
    const q = normalize(label)
    if (!q || !focused) return []
    return allTags.map((t) => t.name).filter((n) => normalize(n).includes(q) && n !== label).slice(0, 5)
  }, [label, allTags, focused])

  const save = () => {
    const parsed = parseTimeInput(digits)
    if (parsed.error) { setError({ field: 'time', msg: parsed.error }); timeRef.current?.focus(); return }
    const text = label.trim()
    if (!text) { setError({ field: 'label', msg: 'מה קורה ברגע הזה?' }); labelRef.current?.focus(); return }
    if (moments.some((m) => m.tag === text && m.t === parsed.sec)) { setError({ field: 'dup', msg: 'הרגע הזה כבר שמור' }); return }
    onSave(text, parsed.sec)
  }

  const inputTone = dark
    ? 'border-stone-600 bg-stone-800 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/30'
    : 'border-line-strong bg-surface placeholder:text-subtle focus:border-focus focus:ring-focus/25'

  return (
    <div
      data-moment-composer
      className={`animate-fade-in space-y-2 px-3 py-2.5 ${dark ? 'bg-stone-900 text-stone-100' : 'border-b border-line bg-surface'}`}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }}
    >
      <div className="flex items-end gap-2">
        <TimeInput
          ref={timeRef}
          digits={digits}
          onDigits={(d) => { setDigits(d); setError(null) }}
          invalid={error?.field === 'time'}
          describedBy={hintId}
          onEnter={() => labelRef.current?.focus()}
          dark={dark}
          autoFocus={autoFocus}
        />
        <label className="relative flex min-w-0 flex-1 flex-col gap-1">
          <span className={`text-xs font-medium ${dark ? 'text-stone-300' : 'text-muted'}`}>מה רואים כאן?</span>
          <input
            ref={labelRef}
            value={label}
            onChange={(e) => { setLabel(e.target.value); setError(null) }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
            enterKeyHint="done"
            maxLength={40}
            placeholder="למשל: עידן צונח"
            aria-invalid={error?.field === 'label' || undefined}
            className={`h-12 w-full min-w-0 rounded-xl border px-3 text-base outline-none transition focus:ring-2 ${error?.field === 'label' ? 'border-rose-500' : ''} ${inputTone}`}
          />
          {options.length > 0 && (
            <ul className={`absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border p-1 shadow-xl ${dark ? 'border-stone-700 bg-stone-900' : 'border-line bg-surface'}`}>
              {options.map((o) => (
                <li key={o}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); setLabel(o) }} className={`w-full rounded-lg px-3 py-2.5 text-start text-sm ${dark ? 'hover:bg-stone-800' : 'hover:bg-surface-2'}`}>{o}</button>
                </li>
              ))}
            </ul>
          )}
        </label>
        <button type="button" onClick={save} className="h-12 shrink-0 rounded-xl bg-amber-500 px-4 text-base font-semibold text-stone-950 hover:bg-amber-400">שמור</button>
        <button type="button" onClick={onClose} className={`flex size-11 shrink-0 items-center justify-center self-end rounded-full ${dark ? 'text-stone-300 hover:bg-stone-800' : 'text-muted hover:bg-surface-2'}`} aria-label="סגור">
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {chips.length > 0 && (
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 landscape:max-sm:hidden">
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => { setLabel(c); setError(null) }}
              className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-sm ${label === c ? (dark ? 'border-white bg-white text-stone-950' : 'border-ink bg-ink text-paper') : dark ? 'border-stone-600 text-stone-200 hover:border-amber-500' : 'border-line text-ink hover:border-amber-500'}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <p id={hintId} role={error ? 'alert' : undefined} className={`text-xs leading-relaxed ${error ? 'font-semibold text-rose-500' : `landscape:max-sm:hidden ${dark ? 'text-stone-300' : 'text-muted'}`}`}>
        {error?.msg || <>הזמן מופיע בתחתית הנגן משמאל — המספר הראשון (למשל <span dir="ltr">22:10</span> מתוך <span dir="ltr">22:10 / 59:00</span>). לא רואים? הקישו פעם על הסרטון.</>}
        {!error && digits && <> · יישמר כ-<span dir="ltr" className="font-semibold tabular-nums">{formatTime(parseTimeInput(digits).sec ?? 0)}</span></>}
      </p>
    </div>
  )
}
