import { useMemo, useRef, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import TagChip from './TagChip.jsx'
import { normalize } from '../lib/search.js'

/** Add / remove tags on a single movie, with autocomplete and smart suggestions. */
export default function TagEditor({ movie, tags, allTags, onAdd, onRemove, onTagClick }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
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
    const t = (tag ?? value).trim()
    if (!t) return
    onAdd(movie.id, t)
    setValue('')
    setHighlighted(0)
    inputRef.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(open && options[highlighted] && normalize(options[highlighted]) !== normalize(value) && value ? options[highlighted] : value)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Backspace' && !value && tags.length) {
      onRemove(movie.id, tags[tags.length - 1])
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation(); setOpen(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5">
        {tags.length === 0 && <span className="text-sm text-stone-500 dark:text-stone-400">אין עדיין תגיות לסרט הזה.</span>}
        {tags.map((t) => (
          <TagChip key={t} name={t} onClick={onTagClick} onRemove={(name) => onRemove(movie.id, name)} />
        ))}
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); setOpen(true); setHighlighted(0) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="הוסף תגית (לדוגמה: ילדות, טיול, מצחיק)…"
            maxLength={40}
            className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 dark:border-stone-700 dark:bg-stone-900"
            aria-label="תגית חדשה"
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-autocomplete="list"
          />
          <button
            type="button"
            onClick={() => commit()}
            disabled={!value.trim()}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" /> הוסף
          </button>
        </div>
        {open && options.length > 0 && (
          <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 max-h-44 animate-fade-in overflow-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl dark:border-stone-700 dark:bg-stone-900">
            {options.map((o, i) => (
              <li key={o} role="option" aria-selected={i === highlighted}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); commit(o) }}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`w-full rounded-lg px-3 py-1.5 text-start text-sm ${i === highlighted ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200' : ''}`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 text-stone-500 dark:text-stone-400"><Sparkles className="size-3.5 text-amber-500" /> הצעות:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="rounded-full border border-dashed border-amber-500/60 px-2.5 py-0.5 text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-300"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
