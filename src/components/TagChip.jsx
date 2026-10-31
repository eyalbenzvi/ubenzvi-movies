import { Play, Tag, X } from 'lucide-react'
import { formatTime } from '../lib/time.js'

/**
 * Interactive tag pill. `onClick` filters by the tag; `onRemove` (optional) adds an ✕ button.
 * `times` (seconds) render as "▶ 22:10" buttons that call `onTimeClick(t)`.
 */
export default function TagChip({ name, active = false, count, onClick, onRemove, times, onTimeClick }) {
  const tone = active
    ? 'border-amber-500 bg-amber-500 text-stone-950'
    : 'border-line-strong bg-surface text-muted hover:border-amber-500 hover:text-accent-ink   dark:hover:border-amber-500/70 '
  return (
    <span className={`inline-flex min-h-9 max-w-full flex-wrap items-center rounded-full border text-sm font-medium transition-colors ${tone}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick?.(name) }}
        className={`inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full ps-3 ${onRemove || times?.length ? 'pe-1' : 'pe-3'}`}
        title={`הצג את כל הסרטים עם התגית "${name}"`}
        aria-pressed={active}
      >
        <Tag className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{name}</span>
        {count != null && <span className={`tabular-nums ${active ? 'text-stone-800' : 'text-muted'}`}>{count}</span>}
      </button>
      {times?.map((t) => (
        <button
          key={t}
          type="button"
          onClick={(e) => { e.stopPropagation(); onTimeClick?.(t) }}
          className="ms-0.5 inline-flex h-7 items-center gap-1 rounded-full bg-amber-500/15 px-2 text-sm font-semibold tabular-nums text-accent-ink hover:bg-amber-500/30"
          aria-label={`נגן את "${name}" מ-${formatTime(t)}`}
          title="קפיצה לרגע הזה בסרטון"
        >
          <Play className="size-3 fill-current" aria-hidden /> <span dir="ltr">{formatTime(t)}</span>
        </button>
      ))}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(name) }}
          className="me-0.5 flex size-8 shrink-0 items-center justify-center rounded-full opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
          aria-label={`הסר את התגית ${name}${times?.length ? ' ואת הזמנים שלה' : ''}`}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  )
}
