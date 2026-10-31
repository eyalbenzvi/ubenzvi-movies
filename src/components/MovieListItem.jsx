import { ExternalLink, FileText, Heart, Play } from 'lucide-react'
import Highlight from './Highlight.jsx'
import MatchInfo from './MatchInfo.jsx'
import TagChip from './TagChip.jsx'
import Thumbnail from './Thumbnail.jsx'

export default function MovieListItem({ movie, match, tags, activeTags, isFavorite, onOpen, onTagClick, onToggleFavorite, style }) {
  return (
    <li
      style={style}
      className="group flex animate-rise items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-stone-200 hover:bg-white dark:hover:border-stone-800 dark:hover:bg-stone-900/70 sm:gap-4 sm:px-3"
    >
      <button type="button" onClick={() => onOpen(movie)} className="relative shrink-0 overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" aria-label={`צפה ב${movie.displayTitle}`}>
        <Thumbnail movie={movie} className="aspect-video w-24 sm:w-32 [&_svg]:size-5 [&_span]:text-base" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <Play className="size-5 fill-white text-white" />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <button type="button" onClick={() => onOpen(movie)} className="min-w-0 truncate text-start font-semibold text-stone-900 hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-300">
            <Highlight text={movie.displayTitle} terms={match?.terms} />
          </button>
          {movie.year && <span className="shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-400">{movie.year}</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {movie.detailsUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              <FileText className="size-3" /> מה בקלטת
            </span>
          )}
          {tags.map((t) => (
            <TagChip key={t} name={t} size="xs" active={activeTags.includes(t)} onClick={onTagClick} />
          ))}
        </div>
        {match?.snippet && <div className="mt-1.5 max-w-2xl"><MatchInfo match={match} compact /></div>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onToggleFavorite(movie.id)}
          className={`rounded-full p-2 transition ${isFavorite ? 'text-rose-500' : 'text-stone-400 hover:text-rose-500'}`}
          aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          aria-pressed={isFavorite}
        >
          <Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        {movie.movieUrl && (
          <a href={movie.movieUrl} target="_blank" rel="noopener noreferrer" className="hidden rounded-full p-2 text-stone-400 transition hover:text-amber-600 sm:inline-flex" aria-label="פתח בחלון חדש" title="פתח בחלון חדש">
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>
    </li>
  )
}
