import { useMemo, useRef, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import TagChip from './TagChip.jsx'
import { normalize } from '../lib/search.js'
import { splitTrailingTime } from '../lib/time.js'

/**
 * Add / remove tags on a single movie, with autocomplete and smart suggestions.
 * Moments in the video are marked from the "סמן רגע" bar under the player; typing
 * "עידן צונח 22:10" here is a shortcut that also creates one.
 */
export default function TagEditor({ movie, tags, moments = [], allTags, onAdd, onRemove, onTagClick }) {
  const [value, setValue] = useState('')

  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1) // -1 = the typed text itself
  const inputRef = useRef(null)

  const options = useMemo(() => {
    const q = normalize(value)
    return allTags
      .map((t) => t.name)
      .filter((name) => !tags.includes(name) && (!q || normalize(name).includes(q)))
      .slice(0, 8)
  }, [value, allTags, tags])

  const suggestions = useMemo(
    () => [...new Set(movie.suggestedTags)].filter((t) => !tags.includes(t)),
    [movie.suggestedTags, tags],
  )

  const commit = (tag) => {
    // Hidden shortcut: "עידן צונח 22:10" also creates a moment at 22:10
    const { label, t: inlineTime } = splitTrailingTime(tag ?? value)
    if (!label) return
    onAdd(movie.id, label, inlineTime)
    setValue('')
    setHighlighted(-1)
    inputRef.current?.focus()
  }

  const momentCount = useMemo(() => {
    const map = new Map()
    for (const m of moments) map.set(m.tag, (map.get(m.tag) || 0) + 1)
    return map
  }, [moments])

  const remove = (name) => {
    const n = momentCount.get(name)
    if (n && !window.confirm(`להסיר את התגית ״${name}״ ואת ${n === 1 ? 'הרגע שלה' : `${n} הרגעים שלה`}?`)) return
    onRemove(movie.id, name)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(open && highlighted >= 0 && options[highlighted] ? options[highlighted] : value)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === 'Backspace' && !value && tags.length) {
      remove(tags[tags.length - 1])
    } else if (e.key === 'Escape' && open && options.length > 0) {
      e.stopPropagation(); setOpen(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5">
        {tags.length === 0 && <span className="text-sm text-muted">עוד אין תגיות לסרט הזה.</span>}
        {tags.map((t) => (
          <TagChip key={t} name={t} onClick={onTagClick} onRemove={remove} momentCount={momentCount.get(t)} />
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
            placeholder="הוסף תגית (לדוגמה: ילדות, טיול, מצחיק)…"
            maxLength={40}
            className="h-11 min-w-0 flex-1 rounded-2xl border border-line-strong bg-surface px-3 text-base sm:text-sm outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/25"
            aria-label="תגית חדשה"
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-autocomplete="list"
          />
          <button
            type="button"
            onClick={() => commit()}
            disabled={!value.trim()}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-2xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/35 disabled:text-stone-950/60"
          >
            <Plus className="size-4" /> הוסף
          </button>
        </div>
        {open && options.length > 0 && (
          <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 max-h-44 origin-top transition-[opacity,scale] duration-150 ease-[var(--ease-out)] starting:scale-[0.97] starting:opacity-0 overflow-auto rounded-2xl border border-line bg-surface p-1 shadow-xl">
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
