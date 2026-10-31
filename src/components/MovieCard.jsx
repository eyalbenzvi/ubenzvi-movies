import { FileText, Heart, Play } from 'lucide-react'
import Highlight from './Highlight.jsx'
import MatchInfo from './MatchInfo.jsx'
import Thumbnail from './Thumbnail.jsx'

/** Year text: "1997" or "1996–1997". */
export function yearLabel(m) {
  if (!m.year) return null
  return m.yearEnd && m.yearEnd !== m.year ? `${m.year}–${m.yearEnd}` : String(m.year)
}

/**
 * Poster card. Tapping anywhere opens the movie; the only other control is the favorite heart
 * (always visible on touch screens, revealed on hover with a mouse).
 */
export default function MovieCard({ movie, match, tags, isFavorite, watched, onOpen, onToggleFavorite, compact = false }) {
  const year = yearLabel(movie)
  return (
    <article className="group relative flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(movie, match?.moments?.[0]?.t)}
        className="relative block aspect-video w-full overflow-hidden rounded-xl bg-stone-900 text-start shadow-sm ring-1 ring-black/5 transition-all duration-300 can-hover:group-hover:shadow-xl can-hover:group-hover:shadow-black/30 can-hover:group-hover:ring-amber-500/50 dark:ring-white/5"
        aria-label={`${movie.displayTitle}${year ? `, ${year}` : ''}`}
      >
        <Thumbnail movie={movie} className="size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 via-40%" />
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/30 to-transparent" />

        <span className="absolute inset-0 m-auto flex size-12 scale-90 items-center justify-center rounded-full bg-amber-500/95 text-stone-950 opacity-0 shadow-lg shadow-black/40 transition-all duration-300 can-hover:group-hover:scale-100 can-hover:group-hover:opacity-100">
          <Play className="size-5 fill-current" aria-hidden />
        </span>

        {year && (
          <span className="absolute bottom-1.5 start-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">{year}</span>
        )}
        {movie.detailsUrl && (
          <span className="absolute start-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-stone-950" title='יש פירוט "מה בקלטת"'>
            <FileText className="size-3" aria-hidden /><span className={compact ? 'sr-only' : 'max-sm:sr-only'}>מה בקלטת</span>
          </span>
        )}
        {watched && <span className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" title="נצפה לאחרונה" />}
      </button>

      <button
        type="button"
        onClick={() => onToggleFavorite(movie.id)}
        className={`absolute end-1 top-1 flex size-11 items-center justify-center rounded-full transition ${
          isFavorite ? 'text-rose-500' : 'text-white/90 can-hover:opacity-0 can-hover:group-hover:opacity-100 focus-visible:opacity-100'
        }`}
        aria-label={isFavorite ? `הסר את ${movie.displayTitle} מהמועדפים` : `הוסף את ${movie.displayTitle} למועדפים`}
        aria-pressed={isFavorite}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/15 backdrop-blur-sm">
          <Heart className={`size-[18px] stroke-[2.25] ${isFavorite ? 'fill-current' : ''}`} aria-hidden />
        </span>
      </button>

      <div className="px-0.5 pt-2">
        <h3 className={`line-clamp-2 font-semibold leading-5 text-ink ${compact ? 'text-sm' : 'text-sm sm:text-base sm:leading-6'}`}>
          <button type="button" tabIndex={-1} onClick={() => onOpen(movie, match?.moments?.[0]?.t)} className="text-start can-hover:hover:text-accent-ink">
            <Highlight text={movie.displayTitle} terms={match?.terms} />
          </button>
        </h3>
        {tags?.length > 0 && !compact && (
          <p className="mt-1 truncate text-xs text-muted">{tags.join(' · ')}</p>
        )}
        {(match?.snippet || match?.moments?.length > 0) && <div className="mt-1.5"><MatchInfo match={match} compact onOpenAt={(t) => onOpen(movie, t)} /></div>}
      </div>
    </article>
  )
}
