import { FileText, Heart } from 'lucide-react'
import Highlight from './Highlight.jsx'
import MatchInfo from './MatchInfo.jsx'
import Thumbnail from './Thumbnail.jsx'
import { yearLabel } from './MovieCard.jsx'

export default function MovieListItem({ movie, match, tags, isFavorite, watched, onOpen, onToggleFavorite }) {
  const year = yearLabel(movie)
  return (
    <li className="group flex items-start gap-3 rounded-xl px-1.5 py-2 transition-colors can-hover:hover:bg-surface sm:items-center sm:gap-4 sm:px-3">
      <button
        type="button"
        onClick={() => onOpen(movie, match?.moments?.[0]?.t)}
        className="relative shrink-0 overflow-hidden rounded-lg"
        aria-label={`${movie.displayTitle}${year ? `, ${year}` : ''}`}
      >
        <Thumbnail movie={movie} className="aspect-video w-28 sm:w-36" iconClass="size-5" />
        {watched && <span className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" />}
      </button>

      <div className="min-w-0 flex-1">
      <button type="button" onClick={() => onOpen(movie, match?.moments?.[0]?.t)} className="block w-full text-start" tabIndex={-1}>
        <span className="line-clamp-2 font-semibold leading-snug text-ink can-hover:group-hover:text-accent-ink">
          <Highlight text={movie.displayTitle} terms={match?.terms} />
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {year && <span className="tabular-nums">{year}</span>}
          {movie.detailsUrl && (
            <span className="inline-flex items-center gap-1 text-accent-ink"><FileText className="size-3" aria-hidden /> מה בקלטת</span>
          )}
          {tags?.length > 0 && <span className="truncate">{tags.join(' · ')}</span>}
        </span>
      </button>
        {(match?.snippet || match?.moments?.length > 0) && <div className="mt-1.5 max-w-2xl"><MatchInfo match={match} compact onOpenAt={(t) => onOpen(movie, t)} /></div>}
      </div>

      <button
        type="button"
        onClick={() => onToggleFavorite(movie.id)}
        className={`flex size-11 shrink-0 items-center justify-center self-center rounded-full transition ${isFavorite ? 'text-rose-500' : 'text-subtle can-hover:hover:text-rose-500'}`}
        aria-label={isFavorite ? `הסר את ${movie.displayTitle} מהמועדפים` : `הוסף את ${movie.displayTitle} למועדפים`}
        aria-pressed={isFavorite}
      >
        <Heart className={`size-5 ${isFavorite ? 'fill-current' : ''}`} aria-hidden />
      </button>
    </li>
  )
}
