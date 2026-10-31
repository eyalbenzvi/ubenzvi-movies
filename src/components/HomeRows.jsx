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
    <section className="relative -mx-4 overflow-hidden bg-stone-950 text-white sm:mx-0 sm:rounded-3xl" aria-label="סרט מומלץ">
      {/* Phone: image on top, text below on a solid background. ≥ sm: text over the image with a strong scrim. */}
      <div className="relative">
        <Thumbnail movie={movie} className="aspect-video w-full sm:aspect-auto sm:h-[clamp(320px,42vw,500px)]" iconClass="size-14" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-stone-950 to-transparent sm:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-black/95 via-black/35 to-transparent sm:block" />
        <div className="absolute inset-0 hidden bg-gradient-to-l from-black/80 via-black/30 to-transparent sm:block" />
      </div>
      <div className="flex flex-col gap-2.5 px-4 pb-5 pt-1 sm:absolute sm:inset-x-0 sm:bottom-0 sm:max-w-2xl sm:gap-3 sm:p-8">
        <span className="w-fit rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-stone-950">מהארכיון</span>
        <h2 className="font-display text-2xl font-bold leading-tight sm:text-4xl sm:[text-shadow:0_2px_16px_rgb(0_0_0/0.8)]">{movie.displayTitle}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-300 sm:text-stone-100">
          {year && <span className="tabular-nums">{year}</span>}
          {movie.detailsUrl && <span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden /> {segments?.length === 1 ? 'קטע אחד' : `${segments?.length} קטעים`}</span>}
        </div>
        {blurb && <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-stone-300 sm:text-stone-100 sm:[text-shadow:0_1px_8px_rgb(0_0_0/0.8)]">{blurb}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => onOpen(movie)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-stone-950 transition hover:bg-amber-400 sm:flex-none">
            <Play className="size-4 fill-current" aria-hidden /> צפייה
          </button>
          <button type="button" onClick={onShuffle} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/25 sm:flex-none">
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
