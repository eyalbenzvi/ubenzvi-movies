import { useRef } from 'react'
import { ChevronLeft, ChevronRight, FileText, Play, Shuffle } from 'lucide-react'
import MovieCard, { yearLabel } from './MovieCard.jsx'
import Thumbnail from './Thumbnail.jsx'
import { formatTime } from '../lib/time.js'

/** Big featured banner at the top of the home screen. */
export function Hero({ movie, segments, onOpen, onShuffle }) {
  if (!movie) return null
  const year = yearLabel(movie)
  const blurb = segments?.length ? segments.slice(0, 4).map((s) => s.text).join(' · ') : null
  return (
    <section className="relative -mx-4 overflow-hidden bg-paper text-ink sm:mx-0 sm:rounded-3xl sm:bg-stone-950 sm:text-white" aria-label="סרט מומלץ">
      {/* Phone: image on top, text below on a solid background. ≥ sm: text over the image with a strong scrim. */}
      <div className="relative">
        <Thumbnail movie={movie} className="aspect-video w-full sm:aspect-auto sm:h-[clamp(300px,34vw,440px)]" iconClass="size-14" label />
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-paper to-transparent sm:hidden" />
        {/* one corner scrim behind the text (RTL: bottom-right) instead of darkening the whole frame */}
        <div className="absolute inset-0 hidden bg-[radial-gradient(120%_90%_at_100%_100%,rgb(0_0_0/0.92)_0%,rgb(0_0_0/0.55)_45%,transparent_75%)] sm:block" />
      </div>
      <div className="flex flex-col gap-2.5 px-4 pb-5 pt-1 sm:absolute sm:inset-x-0 sm:bottom-0 sm:max-w-2xl sm:gap-3 sm:p-8">
        <span className="text-[13px] font-semibold text-accent-ink sm:text-amber-300">מהארכיון</span>
        <h2 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] sm:text-[46px] sm:[text-shadow:0_2px_16px_rgb(0_0_0/0.8)]">{movie.displayTitle}</h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted sm:text-stone-100">
          {year && <span className="tabular-nums">{year}</span>}
          {movie.detailsUrl && <span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden /> {segments?.length === 1 ? 'קטע אחד' : `${segments?.length} קטעים`}</span>}
        </div>
        {blurb && <p className="line-clamp-1 max-w-xl text-sm leading-relaxed text-muted sm:line-clamp-2 sm:text-stone-100 sm:[text-shadow:0_1px_8px_rgb(0_0_0/0.8)]">{blurb}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => onOpen(movie)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-stone-950 ring-1 ring-black/10 transition hover:bg-amber-400 sm:flex-none dark:ring-0">
            <Play className="size-4 fill-current" aria-hidden /> צפייה
          </button>
          <button type="button" onClick={onShuffle} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-semibold text-ink transition hover:bg-line sm:flex-none sm:bg-white/15 sm:text-white sm:hover:bg-white/25">
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold leading-7 sm:text-2xl">
          {title}
          <span className="ms-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 align-middle font-sans text-xs font-medium tabular-nums text-muted">{movies.length}</span>
        </h2>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} className="inline-flex h-9 items-center gap-0.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink">
            הכל <ChevronLeft className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="relative">
        <div ref={scroller} className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto sm:gap-3 px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:px-0">
          {movies.map((m) => (
            <div key={m.id} className="w-[42vw] shrink-0 snap-start sm:w-56 lg:w-60">
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

/** "הרגעים שלי" — every timestamped tag across the archive; tap opens the movie at that moment. */
export function MomentShelf({ items, onOpen }) {
  if (!items.length) return null
  return (
    <section aria-label="הרגעים שלי">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold leading-7 sm:text-2xl">
          הרגעים שלי
          <span className="ms-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 align-middle font-sans text-xs font-medium tabular-nums text-muted">{items.length}</span>
        </h2>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:gap-3 sm:px-0">
        {items.map(({ movie, tag, t }) => (
          <button key={`${movie.id}-${tag}-${t}`} type="button" onClick={() => onOpen(movie, t)}
            className="group w-[42vw] shrink-0 snap-start text-start sm:w-56 lg:w-60"
            aria-label={`${tag} · ${formatTime(t)} · ${movie.displayTitle}`}>
            <span className="relative block aspect-video overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/5">
              <Thumbnail movie={movie} className="size-full" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
              <span dir="ltr" className="absolute bottom-1.5 start-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-stone-950">
                <Play className="size-3 fill-current" aria-hidden />{formatTime(t)}
              </span>
            </span>
            <span className="mt-2 block truncate text-sm font-semibold text-ink">{tag}</span>
            <span className="block truncate text-xs text-muted">{movie.displayTitle}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
