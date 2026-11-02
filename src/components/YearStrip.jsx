/**
 * "ציר הזמן של המשפחה" — the archive's own signature element (taste-skill: one element only this
 * product has). One column per year from the first recording to the last; the bar is the number of
 * recordings that year, drawn at its true size (an empty year has no bar). Tapping a year filters to it.
 */
export default function YearStrip({ yearCounts, undated, onPickYear, onPickUndated, inline = false }) {
  const max = Math.max(1, ...yearCounts.map((y) => y.count))
  // Runs of 3+ empty years collapse into one labelled gap (still honest, no wasted width)
  const items = []
  for (let i = 0; i < yearCounts.length; ) {
    if (!yearCounts[i].count) {
      let j = i
      while (j < yearCounts.length && !yearCounts[j].count) j++
      if (j - i >= 3) { items.push({ gap: true, from: yearCounts[i].year, to: yearCounts[j - 1].year }); i = j; continue }
    }
    items.push(yearCounts[i]); i++
  }
  return (
    <div className={inline ? 'shrink-0' : 'no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0'} role="group" aria-label="ציר הזמן של המשפחה: מספר הקלטות בכל שנה">
      <div className={`flex items-end gap-px ${inline ? 'min-w-max' : 'min-w-max sm:min-w-0'}`}>
        {items.map((item) => {
          if (item.gap) {
            return (
              <span key={`gap-${item.from}`} className="flex h-16 w-14 shrink-0 flex-col items-center justify-end gap-1 pb-0.5 sm:w-auto sm:min-w-14 sm:flex-[2]" aria-label={`אין הקלטות בשנים ${item.from}–${item.to}`} role="img">
                <span className="mb-1 h-px w-8 border-t border-dashed border-line-strong" aria-hidden />
                <span className="text-xs tabular-nums text-muted opacity-70" dir="ltr">'{String(item.from).slice(2)}–'{String(item.to).slice(2)}</span>
              </span>
            )
          }
          const { year, count } = item
          const decadeStart = year % 10 === 0
          return (
            <button
              key={year}
              type="button"
              disabled={!count}
              data-year={year}
              onClick={() => onPickYear(year)}
              aria-label={`${year}: ${count ? `${count} הקלטות` : 'אין הקלטות'}`}
              title={`${year} · ${count}`}
              className="group flex h-16 w-11 shrink-0 flex-col items-center justify-end gap-1 rounded-lg pb-0.5 disabled:cursor-default sm:w-auto sm:min-w-0 sm:flex-1 can-hover:enabled:hover:bg-surface-2"
            >
              <span
                className="w-3 rounded-t-sm bg-amber-500 transition-[scale] duration-150 ease-[var(--ease-out)] can-hover:group-enabled:group-hover:scale-x-125"
                style={{ height: count ? `${Math.max(4, Math.round((count / max) * 40))}px` : 0 }}
              />
              <span className={`text-xs tabular-nums ${decadeStart ? 'font-semibold text-ink' : 'text-muted'} ${count ? '' : 'opacity-50'}`}>
                {decadeStart || year === yearCounts[0].year ? year : `'${String(year).slice(2)}`}
              </span>
            </button>
          )
        })}
        {undated > 0 && (
          <button type="button" onClick={onPickUndated}
            className="ms-2 flex h-16 shrink-0 flex-col items-center justify-end gap-1 rounded-lg px-2 pb-0.5 can-hover:hover:bg-surface-2"
            aria-label={`ללא שנה: ${undated} הקלטות`}>
            <span className="text-sm font-semibold tabular-nums text-ink">{undated}</span>
            <span className="text-xs text-muted">ללא שנה</span>
          </button>
        )}
      </div>
    </div>
  )
}
