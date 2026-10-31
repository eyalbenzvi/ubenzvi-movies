import { useRef } from 'react'
import { ChevronLeft, ChevronRight, FileText, Play, Shuffle } from 'lucide-react'
import MovieCard, { yearLabel } from './MovieCard.jsx'
import Thumbnail from './Thumbnail.jsx'

/** Big featured banner at the top of the home screen. */
export function Hero({ movie, segments, onOpen, onShuffle }) {
  if (!movie) return null
  const year = yearLabel(movie)
  const blurb = segments?.length ? segments.slice(0, 4).map((s) => s.text).join(' · ') : null
  return (
    <section className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl" aria-label="סרט מומלץ">
      <Thumbnail movie={movie} className="h-[62vw] max-h-[480px] min-h-[260px] w-full" iconClass="size-14" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-stone-50/20 to-transparent dark:from-[#120e0b] dark:via-[#120e0b]/30 sm:from-black/80 sm:via-black/25" />
      <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/10 to-transparent max-sm:hidden" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:max-w-2xl sm:p-8">
        <span className="w-fit rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-stone-950">מהארכיון</span>
        <h2 className="font-display text-2xl font-bold leading-tight text-stone-900 drop-shadow-sm sm:text-4xl sm:text-white dark:text-white">{movie.displayTitle}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-700 sm:text-stone-100 dark:text-stone-200">
          {year && <span className="tabular-nums">{year}</span>}
          {movie.detailsUrl && <span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden /> {segments?.length === 1 ? 'קטע אחד' : `${segments?.length} קטעים`}</span>}
        </div>
        {blurb && <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-stone-700 sm:text-stone-100 dark:text-stone-300">{blurb}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => onOpen(movie)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-stone-950 shadow-lg shadow-black/20 transition hover:bg-amber-400">
            <Play className="size-4 fill-current" aria-hidden /> צפייה
          </button>
          <button type="button" onClick={onShuffle} className="inline-flex h-11 items-center gap-2 rounded-xl bg-stone-900/70 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-stone-900/85 dark:bg-white/15 dark:hover:bg-white/25">
            <Shuffle className="size-4" aria-hidden /> סרט אקראי
          </button>
        </div>
      </div>
    </section>
  )
}

/** One horizontally scrolling shelf. */
export function Row({ title, movies, onSeeAll, cardProps }) {
  const scroller = useRef(null)
  if (!movies.length) return null
  // RTL: scrolling "forward" moves content towards the left (negative scrollLeft)
  const scroll = (dir) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * -el.clientWidth * 0.85, behavior: 'smooth' })
  }
  return (
    <section className="group/row relative" aria-label={title}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold sm:text-xl">
          {title} <span className="text-sm font-medium tabular-nums text-stone-500 dark:text-stone-400">{movies.length}</span>
        </h2>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} className="inline-flex h-9 items-center gap-0.5 rounded-lg px-2 text-sm font-semibold text-amber-700 hover:bg-amber-500/10 dark:text-amber-300">
            הכל <ChevronLeft className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="relative">
        <div ref={scroller} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:px-0">
          {movies.map((m) => (
            <div key={m.id} className="w-[44vw] shrink-0 snap-start sm:w-56 lg:w-60">
              <MovieCard movie={m} {...cardProps(m)} compact />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => scroll(-1)} tabIndex={-1} aria-hidden className="absolute -start-4 top-0 hidden h-[126px] w-10 lg:h-[135px] items-center justify-center rounded-e-xl bg-black/50 text-white opacity-0 transition hover:bg-black/70 can-hover:flex can-hover:group-hover/row:opacity-100">
          <ChevronRight className="size-6" />
        </button>
        <button type="button" onClick={() => scroll(1)} tabIndex={-1} aria-hidden className="absolute -end-4 top-0 hidden h-[126px] w-10 lg:h-[135px] items-center justify-center rounded-s-xl bg-black/50 text-white opacity-0 transition hover:bg-black/70 can-hover:flex can-hover:group-hover/row:opacity-100">
          <ChevronLeft className="size-6" />
        </button>
      </div>
    </section>
  )
}
