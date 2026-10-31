import { Tag, X } from 'lucide-react'

/** Interactive tag pill. `onClick` filters by tag; `onRemove` (optional) shows an ✕ button. */
export default function TagChip({ name, active = false, count, onClick, onRemove, size = 'sm' }) {
  const base =
    'group inline-flex max-w-full items-center gap-1 rounded-full border font-medium transition-all duration-200 ' +
    (size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs')
  const tone = active
    ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
    : 'border-stone-300 bg-white/70 text-stone-700 hover:border-amber-500 hover:text-amber-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:border-amber-500/70 dark:hover:text-amber-300'

  return (
    <span className={`${base} ${tone}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick?.(name) }}
        className="inline-flex min-w-0 items-center gap-1 focus:outline-none"
        title={`סנן לפי "${name}"`}
      >
        <Tag className="size-3 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{name}</span>
        {count != null && <span className={`tabular-nums ${active ? 'opacity-80' : 'opacity-50'}`}>{count}</span>}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(name) }}
          className="-me-1 rounded-full p-0.5 opacity-60 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
          aria-label={`הסר תגית ${name}`}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}
