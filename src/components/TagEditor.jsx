import { useMemo, useRef, useState } from 'react'
import { Clock, Plus, Sparkles } from 'lucide-react'
import TagChip from './TagChip.jsx'
import { normalize } from '../lib/search.js'
import { parseTime, splitTrailingTime } from '../lib/time.js'

/**
 * Add / remove tags on a single movie, with autocomplete and smart suggestions.
 * A tag can carry a time in the video ("עידן צונח 22:10", or the separate time field):
 * the browser can't read Google's player position, so the user types the time it shows.
 */
export default function TagEditor({ movie, tags, moments = [], allTags, onAdd, onRemove, onTagClick, onJump }) {
  const [value, setValue] = useState('')
  const [time, setTime] = useState('')
  const timeSec = parseTime(time)
  const timeInvalid = time.trim() !== '' && timeSec == null
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1) // -1 = the typed text itself
  const inputRef = useRef(null)

  const options = useMemo(() => {
    const q = normalize(value)
    return allTags
      .map((t) => t.name)
      .filter((name) => (!tags.includes(name) || time.trim()) && (!q || normalize(name).includes(q)))
      .slice(0, 8)
  }, [value, allTags, tags, time])

  const suggestions = useMemo(
    () => [...new Set(movie.suggestedTags)].filter((t) => !tags.includes(t)),
    [movie.suggestedTags, tags],
  )

  const commit = (tag) => {
    if (timeInvalid) return
    const { label, t: inlineTime } = splitTrailingTime(tag ?? value)
    if (!label) return
    onAdd(movie.id, label, timeSec ?? inlineTime)
    setValue('')
    setTime('')
    setHighlighted(-1)
    inputRef.current?.focus()
  }

  const timesByTag = useMemo(() => {
    const map = new Map()
    for (const m of moments) map.set(m.tag, [...(map.get(m.tag) || []), m.t])
    return map
  }, [moments])

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(open && highlighted >= 0 && options[highlighted] ? options[highlighted] : value)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === 'Backspace' && !value && tags.length) {
      onRemove(movie.id, tags[tags.length - 1])
    } else if (e.key === 'Escape' && open && options.length > 0) {
      e.stopPropagation(); setOpen(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5">
        {tags.length === 0 && <span className="text-sm text-muted">עוד אין תגיות לסרט הזה.</span>}
        {tags.map((t) => (
          <TagChip key={t} name={t} onClick={onTagClick} onRemove={(name) => onRemove(movie.id, name)} times={timesByTag.get(t)} onTimeClick={onJump} />
        ))}
      </div>

      <div className="relative">
        <div className="flex min-w-0 gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); setOpen(true); setHighlighted(-1) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="תגית (לדוגמה: עידן צונח)…"
            maxLength={40}
            className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-base sm:text-sm outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/25"
            aria-label="תגית חדשה"
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-autocomplete="list"
          />
          <label className={`relative flex h-11 w-[5.5rem] shrink-0 items-center rounded-xl border bg-surface transition focus-within:ring-2 ${timeInvalid ? 'border-rose-500 focus-within:ring-rose-500/30' : 'border-line-strong focus-within:border-focus focus-within:ring-focus/25 '}`}>
            <Clock className="pointer-events-none absolute left-2.5 size-4 text-subtle" aria-hidden />
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
              inputMode="numeric"
              dir="ltr"
              placeholder="22:10"
              maxLength={8}
              aria-label="זמן בסרטון (דקות:שניות), לא חובה"
              aria-invalid={timeInvalid}
              className="h-full w-full rounded-xl bg-transparent pl-8 pr-2 text-center text-base tabular-nums outline-none placeholder:text-subtle sm:text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => commit()}
            disabled={!value.trim() || timeInvalid}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/35 disabled:text-stone-950/60"
          >
            <Plus className="size-4" /> הוסף
          </button>
        </div>
        {open && options.length > 0 && (
          <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 max-h-44 animate-fade-in overflow-auto rounded-xl border border-line bg-surface p-1 shadow-xl">
            {options.map((o, i) => (
              <li key={o} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); commit(o) }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`w-full rounded-lg px-3 py-2.5 text-start text-sm ${i === highlighted ? 'bg-amber-500/15 text-accent-ink' : ''}`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={`text-xs leading-relaxed ${timeInvalid ? 'text-rose-600 dark:text-rose-400' : 'text-muted'}`}>
        {timeInvalid
          ? 'הזמן לא תקין. כתבו דקות:שניות, למשל 22:10'
          : <>רוצים לסמן רגע? עצרו את הסרטון והקלידו בשדה <Clock className="inline size-3" aria-hidden /> את הזמן שמופיע בנגן (למשל <span dir="ltr">22:10</span>). לחיצה על הזמן בתגית תקפוץ לרגע הזה.</>}
      </p>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 text-muted"><Sparkles className="size-3.5 text-amber-500" /> הצעות:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="inline-flex h-9 items-center rounded-full border border-dashed border-amber-500/70 px-3 text-sm text-accent-ink transition hover:bg-amber-500/10"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
