import { Clock, Tag, X } from 'lucide-react'

/**
 * Interactive tag pill. `onClick` filters by the tag; `onRemove` (optional) adds an ✕ button.
 * `momentCount` shows a small ⏱ badge when the tag has moments in the video.
 */
export default function TagChip({ name, active = false, count, onClick, onRemove, momentCount }) {
  const tone = active
    ? 'border-ink bg-ink text-paper'
    : 'border-line-strong bg-surface text-muted hover:border-amber-500 hover:text-accent-ink   dark:hover:border-amber-500/70 '
  return (
    <span className={`inline-flex min-h-9 max-w-full flex-wrap items-center rounded-full border text-sm font-medium transition-colors ${tone}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick?.(name) }}
        className={`inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full ps-3 ${onRemove ? 'pe-1' : 'pe-3'}`}
        title={`הצג את כל הסרטים עם התגית "${name}"`}
        aria-pressed={active}
      >
        <Tag className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{name}</span>
        {momentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs tabular-nums text-accent-ink" title={`${momentCount} רגעים בסרטון`}>
            <Clock className="size-3" aria-hidden />{momentCount}
          </span>
        )}
        {count != null && <span className={`tabular-nums ${active ? 'opacity-70' : 'text-muted'}`}>{count}</span>}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(name) }}
          className="me-0.5 flex size-8 shrink-0 items-center justify-center rounded-full opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
          aria-label={`הסר את התגית ${name}`}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  )
}
