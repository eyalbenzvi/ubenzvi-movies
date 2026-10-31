import { Calendar, FileText, Heart, Play } from 'lucide-react'
import Highlight from './Highlight.jsx'
import MatchInfo from './MatchInfo.jsx'
import TagChip from './TagChip.jsx'
import Thumbnail from './Thumbnail.jsx'

export default function MovieCard({ movie, match, tags, activeTags, isFavorite, onOpen, onTagClick, onToggleFavorite, style }) {
  return (
    <article
      style={style}
      className="group relative flex animate-pop-in flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-900/10 dark:border-stone-800 dark:bg-stone-900/70 dark:hover:border-amber-500/40 dark:hover:shadow-black/40"
    >
      <button
        type="button"
        onClick={() => onOpen(movie)}
        className="relative block aspect-video w-full text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label={`צפה ב${movie.displayTitle}`}
      >
        <Thumbnail movie={movie} className="size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
        <span className="absolute inset-0 m-auto flex size-14 scale-90 items-center justify-center rounded-full bg-amber-500/90 text-stone-950 opacity-0 shadow-lg shadow-black/40 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <Play className="size-6 translate-x-[-1px] fill-current" />
        </span>
        <div className="absolute bottom-2 start-2 flex gap-1.5">
          {movie.detailsUrl && (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-amber-200 backdrop-blur">
              <FileText className="size-3" /> מה בקלטת
            </span>
          )}
          {movie.part && (
            <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-stone-200 backdrop-blur">חלק {movie.part}</span>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onToggleFavorite(movie.id)}
        className={`absolute end-2 top-2 rounded-full p-1.5 backdrop-blur transition ${isFavorite ? 'bg-rose-600 text-white' : 'bg-black/40 text-white/80 opacity-0 hover:bg-black/60 group-hover:opacity-100 focus:opacity-100'}`}
        aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
        aria-pressed={isFavorite}
      >
        <Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3
          className="line-clamp-2 cursor-pointer font-semibold leading-snug text-stone-900 transition-colors group-hover:text-amber-700 dark:text-stone-100 dark:group-hover:text-amber-300"
          onClick={() => onOpen(movie)}
        >
          <Highlight text={movie.displayTitle} terms={match?.terms} />
        </h3>
        {movie.year && (
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
            <Calendar className="size-3.5" />
            {movie.year}{movie.yearEnd && movie.yearEnd !== movie.year ? `–${movie.yearEnd}` : ''}
          </div>
        )}
        <MatchInfo match={match} compact />
        {tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {tags.map((t) => (
              <TagChip key={t} name={t} size="xs" active={activeTags.includes(t)} onClick={onTagClick} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
